import { prisma } from "@/lib/db";
import { addDays, addPeriod, formatDate } from "@/lib/dates";
import { round2 } from "@/lib/money";
import { Prisma } from "@prisma/client";

export const COMPANY_STATE = "Kerala";

export type BillingMode = "DRY" | "COMMIT";

export interface LineCalculation {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  subtotal: number;
  discount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface CalculatedInvoice {
  subscriptionId: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  customerState: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  lines: LineCalculation[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  total: number;
  discountAppliedName?: string;
  willCloseSubscription: boolean;
}

export interface SkippedSubscription {
  subscriptionId: string;
  subscriptionNumber: string;
  customerName: string;
  reason: string;
}

export interface BillingRunResult {
  asOfDate: Date;
  mode: BillingMode;
  invoicesCreated: number;
  totalAmount: number;
  discountsApplied: number;
  skipped: SkippedSubscription[];
  invoices: CalculatedInvoice[];
  persistedInvoiceIds?: string[];
}

/**
 * Checks whether customer is intra-state (Kerala) or inter-state.
 */
export function isIntraState(customerState?: string | null): boolean {
  if (!customerState) return false;
  return customerState.trim().toLowerCase() === COMPANY_STATE.toLowerCase();
}

/**
 * Helper to compute tax and GST split for a line.
 */
export function computeGstSplit(
  taxableAmount: number,
  taxPercent: number,
  intraState: boolean
): { taxAmount: number; cgst: number; sgst: number; igst: number } {
  const taxAmount = round2(taxableAmount * (taxPercent / 100));
  if (intraState) {
    const half = round2(taxAmount / 2);
    // Adjust SGST so cgst + sgst === taxAmount
    return {
      taxAmount,
      cgst: half,
      sgst: round2(taxAmount - half),
      igst: 0,
    };
  }
  return {
    taxAmount,
    cgst: 0,
    sgst: 0,
    igst: taxAmount,
  };
}

/**
 * Pure calculation function for a single subscription as of a date.
 */
export function calculateSubscriptionBilling(
  sub: {
    id: string;
    number: string;
    startDate: Date;
    expirationDate: Date | null;
    nextBillingDate: Date | null;
    customer: { id: string; name: string; state: string | null };
    plan: { billingPeriod: string; autoClose: boolean };
    discount: {
      id: string;
      name: string;
      type: string;
      value: number;
      minPurchase: number;
      minQuantity: number;
      startDate: Date;
      endDate: Date;
      usageLimit: number | null;
      usedCount: number;
    } | null;
    lines: {
      id: string;
      quantity: number;
      unitPrice: number;
      product: { name: string };
      variant: { attribute: string; value: string } | null;
      tax: { percent: number } | null;
    }[];
  },
  asOfDate: Date
): { invoice: CalculatedInvoice; willClose: boolean } {
  const periodStart = sub.nextBillingDate ? new Date(sub.nextBillingDate) : new Date(sub.startDate);
  // periodEnd = addPeriod(periodStart, plan.billingPeriod) - 1 day
  const rawEnd = addPeriod(periodStart, sub.plan.billingPeriod);
  const periodEnd = addDays(rawEnd, -1);
  const dueDate = addDays(periodStart, 7);

  const intraState = isIntraState(sub.customer.state);

  // Compute base lines
  let totalQuantity = 0;
  let subtotal = 0;

  const baseLines = sub.lines.map((l) => {
    const lineSubtotal = round2(l.quantity * l.unitPrice);
    totalQuantity += l.quantity;
    subtotal = round2(subtotal + lineSubtotal);
    const desc = l.variant
      ? `${l.product.name} (${l.variant.attribute}: ${l.variant.value})`
      : l.product.name;
    return {
      description: desc,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxPercent: l.tax?.percent ?? 0,
      subtotal: lineSubtotal,
    };
  });

  // Check discount eligibility
  let discountTotal = 0;
  let discountAppliedName: string | undefined = undefined;

  if (sub.discount) {
    const d = sub.discount;
    const asOfTime = asOfDate.getTime();
    const inDateRange = asOfTime >= new Date(d.startDate).getTime() && asOfTime <= new Date(d.endDate).getTime();
    const withinUsageLimit = d.usageLimit === null || d.usageLimit === undefined || d.usedCount < d.usageLimit;
    const meetsQuantity = totalQuantity >= d.minQuantity;
    const meetsMinPurchase = subtotal >= d.minPurchase;

    if (inDateRange && withinUsageLimit && meetsQuantity && meetsMinPurchase) {
      if (d.type === "PERCENT") {
        discountTotal = round2(subtotal * (d.value / 100));
      } else {
        // FIXED
        discountTotal = round2(Math.min(d.value, subtotal));
      }
      discountAppliedName = d.name;
    }
  }

  // Distribute discount proportionally across lines
  let runningDiscountAssigned = 0;
  const lines: LineCalculation[] = [];
  let taxTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  baseLines.forEach((l, idx) => {
    let lineDiscount = 0;
    if (discountTotal > 0 && subtotal > 0) {
      if (idx === baseLines.length - 1) {
        // Last line absorbs any rounding remainder
        lineDiscount = round2(discountTotal - runningDiscountAssigned);
      } else {
        lineDiscount = round2(discountTotal * (l.subtotal / subtotal));
        runningDiscountAssigned = round2(runningDiscountAssigned + lineDiscount);
      }
    }

    const discountedAmount = Math.max(0, round2(l.subtotal - lineDiscount));
    const gst = computeGstSplit(discountedAmount, l.taxPercent, intraState);

    taxTotal = round2(taxTotal + gst.taxAmount);
    cgstTotal = round2(cgstTotal + gst.cgst);
    sgstTotal = round2(sgstTotal + gst.sgst);
    igstTotal = round2(igstTotal + gst.igst);

    lines.push({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxPercent: l.taxPercent,
      subtotal: l.subtotal,
      discount: lineDiscount,
      taxAmount: gst.taxAmount,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
    });
  });

  const total = round2(subtotal - discountTotal + taxTotal);

  // Check autoClose after advancing period
  const nextPeriod = addPeriod(periodStart, sub.plan.billingPeriod);
  const willClose = Boolean(
    sub.expirationDate &&
      nextPeriod.getTime() > new Date(sub.expirationDate).getTime() &&
      sub.plan.autoClose
  );

  return {
    invoice: {
      subscriptionId: sub.id,
      subscriptionNumber: sub.number,
      customerId: sub.customer.id,
      customerName: sub.customer.name,
      customerState: sub.customer.state || "Unspecified",
      periodStart,
      periodEnd,
      dueDate,
      lines,
      subtotal,
      discountTotal,
      taxTotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      total,
      discountAppliedName,
      willCloseSubscription: willClose,
    },
    willClose,
  };
}

/**
 * Generates next invoice number formatted as INV-0001, INV-0002...
 */
async function generateNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const lastInvoice = await tx.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });

  if (!lastInvoice) {
    return "INV-0001";
  }

  const match = lastInvoice.number.match(/\d+$/);
  if (!match) {
    const count = await tx.invoice.count();
    return `INV-${String(count + 1).padStart(4, "0")}`;
  }

  const num = parseInt(match[0], 10);
  return `INV-${String(num + 1).padStart(4, "0")}`;
}

/**
 * Main Billing Engine entry point.
 * Supports DRY run preview and COMMIT run with Prisma transaction and idempotency.
 */
export async function runBilling(
  asOfDate: Date,
  mode: BillingMode = "DRY",
  actorId?: string
): Promise<BillingRunResult> {
  // Normalize comparison to end of day for asOfDate
  const targetDate = new Date(asOfDate);
  targetDate.setHours(23, 59, 59, 999);

  // Query all ACTIVE subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      customer: true,
      plan: true,
      discount: true,
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, number: true, periodStart: true, periodEnd: true },
      },
      lines: {
        include: {
          product: true,
          variant: true,
          tax: true,
        },
      },
    },
    orderBy: {
      nextBillingDate: "asc",
    },
  });

  const calculatedInvoices: CalculatedInvoice[] = [];
  const skipped: SkippedSubscription[] = [];
  const createdInvoiceIds: string[] = [];
  let discountsAppliedCount = 0;
  let totalAmountSum = 0;

  for (const sub of subscriptions) {
    if (!sub.nextBillingDate) {
      skipped.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        customerName: sub.customer.name,
        reason: "Missing next billing date",
      });
      continue;
    }

    if (sub.lines.length === 0) {
      skipped.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        customerName: sub.customer.name,
        reason: "No subscription line items",
      });
      continue;
    }

    // Check if next billing date is after asOfDate
    if (new Date(sub.nextBillingDate).getTime() > targetDate.getTime()) {
      const lastInv = sub.invoices[0];
      const reasonMsg = lastInv
        ? `Already billed (${lastInv.number}) - next billing on ${formatDate(sub.nextBillingDate)}`
        : `Next billing date (${formatDate(sub.nextBillingDate)}) is after as-of date`;
      skipped.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        customerName: sub.customer.name,
        reason: reasonMsg,
      });
      continue;
    }

    const { invoice: calc, willClose } = calculateSubscriptionBilling(sub, targetDate);

    // Check if an invoice already exists for (subscriptionId, periodStart)
    const existing = await prisma.invoice.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId: sub.id,
          periodStart: calc.periodStart,
        },
      },
      select: { id: true, number: true },
    });

    if (existing) {
      skipped.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        customerName: sub.customer.name,
        reason: `Already billed (${existing.number}) for period ${calc.periodStart.toISOString().split("T")[0]}`,
      });
      continue;
    }

    calculatedInvoices.push(calc);
    if (calc.discountTotal > 0) {
      discountsAppliedCount += 1;
    }
    totalAmountSum = round2(totalAmountSum + calc.total);

    if (mode === "COMMIT") {
      try {
        await prisma.$transaction(async (tx) => {
          const invoiceNumber = await generateNextInvoiceNumber(tx);

          const createdInvoice = await tx.invoice.create({
            data: {
              number: invoiceNumber,
              subscriptionId: sub.id,
              customerId: sub.customerId,
              periodStart: calc.periodStart,
              periodEnd: calc.periodEnd,
              dueDate: calc.dueDate,
              subtotal: calc.subtotal,
              discountTotal: calc.discountTotal,
              taxTotal: calc.taxTotal,
              total: calc.total,
              amountPaid: 0,
              status: "CONFIRMED",
              lines: {
                create: calc.lines.map((l) => ({
                  description: l.description,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  taxPercent: l.taxPercent,
                  discount: l.discount,
                  amount: l.subtotal,
                })),
              },
            },
          });

          createdInvoiceIds.push(createdInvoice.id);

          // Advance nextBillingDate
          const nextBilling = addPeriod(calc.periodStart, sub.plan.billingPeriod);
          const updateData: Prisma.SubscriptionUpdateInput = {
            nextBillingDate: nextBilling,
          };

          if (willClose) {
            updateData.status = "CLOSED";
          }

          await tx.subscription.update({
            where: { id: sub.id },
            data: updateData,
          });

          // Increment discount usage if applicable
          if (sub.discount && calc.discountTotal > 0) {
            await tx.discount.update({
              where: { id: sub.discount.id },
              data: {
                usedCount: { increment: 1 },
              },
            });
          }

          // Create AuditLog entry
          await tx.auditLog.create({
            data: {
              entity: "Invoice",
              entityId: createdInvoice.id,
              action: "CREATE",
              details: `Generated via billing run for period ${calc.periodStart.toISOString().split("T")[0]} to ${calc.periodEnd.toISOString().split("T")[0]}. Total: ${calc.total}`,
              actorId: actorId ?? null,
              subscriptionId: sub.id,
            },
          });
        });
      } catch (err: unknown) {
        // Catch unique constraint violation on (subscriptionId, periodStart)
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          skipped.push({
            subscriptionId: sub.id,
            subscriptionNumber: sub.number,
            customerName: sub.customer.name,
            reason: `Already billed - unique constraint caught for period ${calc.periodStart.toISOString().split("T")[0]}`,
          });
          // Remove from calculated total since it wasn't created
          totalAmountSum = round2(totalAmountSum - calc.total);
          if (calc.discountTotal > 0) {
            discountsAppliedCount = Math.max(0, discountsAppliedCount - 1);
          }
        } else {
          throw err;
        }
      }
    }
  }

  return {
    asOfDate,
    mode,
    invoicesCreated: mode === "COMMIT" ? createdInvoiceIds.length : calculatedInvoices.length,
    totalAmount: totalAmountSum,
    discountsApplied: discountsAppliedCount,
    skipped,
    invoices: calculatedInvoices,
    persistedInvoiceIds: createdInvoiceIds,
  };
}
