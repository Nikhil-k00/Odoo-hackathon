"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { round2 } from "@/lib/money";
import { addDays, startOfDay } from "@/lib/dates";
import {
  flattenIssues,
  subscriptionSchema,
  templateSchema,
  type ActionResult,
  type SubscriptionInput,
  type TemplateInput,
} from "./schemas";
import { canEditLines, canTransition, DEFAULT_QUOTE_VALIDITY_DAYS, type SubscriptionStatus } from "./status";
import { nextSubscriptionNumber } from "./queries";

const STAFF = ["ADMIN", "INTERNAL"] as const;
type Tx = Prisma.TransactionClient;

function fail(errors: Record<string, string>): ActionResult {
  return { ok: false, errors };
}

async function audit(tx: Tx, subscriptionId: string, action: string, details: string, actorId: string) {
  await tx.auditLog.create({
    data: { entity: "Subscription", entityId: subscriptionId, subscriptionId, action, details, actorId },
  });
}

// ---------------------------------------------------------------- templates

export async function saveTemplate(id: string | null, input: TemplateInput): Promise<ActionResult> {
  await requireRole([...STAFF]);
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return fail(flattenIssues(parsed.error));
  const { name, validityDays, planId, lines } = parsed.data;

  if (!(await prisma.recurringPlan.findUnique({ where: { id: planId } }))) return fail({ planId: "Plan not found" });

  const saved = await prisma.$transaction(async (tx) => {
    if (id) {
      await tx.templateLine.deleteMany({ where: { templateId: id } });
      return tx.quotationTemplate.update({
        where: { id },
        data: { name, validityDays, planId, lines: { create: lines } },
      });
    }
    return tx.quotationTemplate.create({ data: { name, validityDays, planId, lines: { create: lines } } });
  });
  revalidatePath("/templates");
  return { ok: true, id: saved.id };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  await requireRole([...STAFF]);
  await prisma.quotationTemplate.delete({ where: { id } });
  revalidatePath("/templates");
  return { ok: true, id };
}

// ------------------------------------------------------------ subscriptions

/** Validates line references and computes unit price defaults + amounts from the DB. */
async function buildLines(tx: Tx, input: SubscriptionInput, minQuantity: number) {
  const errors: Record<string, string> = {};
  const rows: Prisma.SubscriptionLineCreateWithoutSubscriptionInput[] = [];

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const product = await tx.product.findUnique({ where: { id: line.productId }, include: { variants: true } });
    if (!product) {
      errors[`lines.${i}.productId`] = "Product not found";
      continue;
    }
    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : null;
    if (line.variantId && !variant) errors[`lines.${i}.variantId`] = "Variant does not belong to this product";
    if (line.quantity < minQuantity) errors[`lines.${i}.quantity`] = `Plan requires at least ${minQuantity}`;

    const unitPrice = round2(line.unitPrice);
    rows.push({
      product: { connect: { id: product.id } },
      variant: variant ? { connect: { id: variant.id } } : undefined,
      tax: line.taxId ? { connect: { id: line.taxId } } : undefined,
      quantity: line.quantity,
      unitPrice,
      amount: round2(unitPrice * line.quantity),
    });
  }
  return { errors, rows };
}

export async function createSubscription(input: SubscriptionInput, templateName?: string | null): Promise<ActionResult> {
  const session = await requireRole([...STAFF]);
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail(flattenIssues(parsed.error));
  const data = parsed.data;

  const [customer, plan] = await Promise.all([
    prisma.user.findFirst({ where: { id: data.customerId, role: "PORTAL" } }),
    prisma.recurringPlan.findUnique({ where: { id: data.planId } }),
  ]);
  if (!customer) return fail({ customerId: "Customer not found" });
  if (!plan) return fail({ planId: "Plan not found" });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const { errors, rows } = await buildLines(tx, data, plan.minQuantity);
      if (Object.keys(errors).length) throw new ValidationError(errors);
      const number = await nextSubscriptionNumber(tx);
      const sub = await tx.subscription.create({
        data: {
          number,
          customerId: data.customerId,
          planId: data.planId,
          startDate: new Date(data.startDate),
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
          paymentTerms: data.paymentTerms,
          discountId: data.discountId || null,
          status: "DRAFT",
          lines: { create: rows },
        },
      });
      const source = templateName ? ` from template "${templateName}"` : "";
      await audit(tx, sub.id, "CREATED", `Subscription ${number} created${source} for ${customer.name} on plan ${plan.name}.`, session.userId);
      return sub;
    });
    revalidatePath("/subscriptions");
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof ValidationError) return fail(e.errors);
    throw e;
  }
}

export async function updateSubscription(id: string, input: SubscriptionInput): Promise<ActionResult> {
  const session = await requireRole([...STAFF]);
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail(flattenIssues(parsed.error));
  const data = parsed.data;

  const existing = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!existing) return fail({ _form: "Subscription not found" });
  if (!canEditLines(existing.status)) return fail({ _form: `A ${existing.status} subscription cannot be edited` });

  const plan = await prisma.recurringPlan.findUnique({ where: { id: data.planId } });
  if (!plan) return fail({ planId: "Plan not found" });

  try {
    await prisma.$transaction(async (tx) => {
      const { errors, rows } = await buildLines(tx, data, plan.minQuantity);
      if (Object.keys(errors).length) throw new ValidationError(errors);
      await tx.subscriptionLine.deleteMany({ where: { subscriptionId: id } });
      await tx.subscription.update({
        where: { id },
        data: {
          customerId: data.customerId,
          planId: data.planId,
          startDate: new Date(data.startDate),
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
          paymentTerms: data.paymentTerms,
          discountId: data.discountId || null,
          lines: { create: rows },
        },
      });
      await audit(tx, id, "UPDATED", `Details and ${rows.length} line(s) updated.`, session.userId);
    });
    revalidatePath("/subscriptions");
    revalidatePath(`/subscriptions/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof ValidationError) return fail(e.errors);
    throw e;
  }
}

/**
 * Moves a subscription to `target`. Enforces the transition map on the server and applies
 * side effects: quote validity on QUOTATION, expiry check on CONFIRMED, nextBillingDate on ACTIVE.
 */
export async function changeStatus(id: string, target: SubscriptionStatus): Promise<ActionResult> {
  const session = await requireRole([...STAFF]);
  return transition(id, target, session.userId, null);
}

/** Portal: the customer may accept their own quotation and pause / close if the plan allows. */
export async function portalChangeStatus(id: string, target: SubscriptionStatus): Promise<ActionResult> {
  const session = await requireRole(["PORTAL"]);
  if (!["CONFIRMED", "PAUSED", "ACTIVE", "CLOSED"].includes(target)) return fail({ _form: "Not allowed" });
  return transition(id, target, session.userId, session.userId);
}

async function transition(id: string, target: SubscriptionStatus, actorId: string, ownerId: string | null): Promise<ActionResult> {
  const sub = await prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
  if (!sub) return fail({ _form: "Subscription not found" });
  if (ownerId && sub.customerId !== ownerId) return fail({ _form: "Not your subscription" });
  if (!canTransition(sub.status, target, sub.plan)) {
    return fail({ _form: `Cannot move from ${sub.status} to ${target}` });
  }

  const today = startOfDay(new Date());
  const data: Prisma.SubscriptionUpdateInput = { status: target };
  let note = "";

  if (target === "QUOTATION") {
    const validUntil = addDays(today, DEFAULT_QUOTE_VALIDITY_DAYS);
    data.quoteValidUntil = validUntil;
    note = ` Quotation valid until ${validUntil.toISOString().slice(0, 10)}.`;
  }
  if (target === "CONFIRMED" && sub.quoteValidUntil && sub.quoteValidUntil < today) {
    return fail({ _form: "This quotation has expired. Send it again before confirming." });
  }
  if (target === "ACTIVE" && sub.status === "CONFIRMED") {
    // What the billing engine (M5) reads: first invoice period starts at the start date.
    data.nextBillingDate = sub.nextBillingDate ?? sub.startDate;
    note = ` Next billing date ${(sub.nextBillingDate ?? sub.startDate).toISOString().slice(0, 10)}.`;
  }

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({ where: { id }, data });
    await audit(tx, id, `STATUS_${target}`, `Status changed ${sub.status} -> ${target}.${note}`, actorId);
  });
  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/portal");
  return { ok: true, id };
}

class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super("validation");
  }
}
