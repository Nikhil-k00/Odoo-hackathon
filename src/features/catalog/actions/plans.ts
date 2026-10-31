"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { planSchema } from "@/features/catalog/schemas";
import type { ActionState } from "@/features/catalog/types";
import { formToObject, invalid } from "./shared";

export async function createPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = planSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const plan = await prisma.recurringPlan.create({
    data: { ...parsed.data, endDate: parsed.data.endDate ?? null },
  });
  revalidatePath("/plans");
  return { ok: true, message: `Plan "${plan.name}" created`, id: plan.id };
}

export async function updatePlanAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = planSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await prisma.recurringPlan.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Plan not found" };

  await prisma.recurringPlan.update({
    where: { id },
    data: { ...parsed.data, endDate: parsed.data.endDate ?? null },
  });
  revalidatePath("/plans");
  return { ok: true, message: "Plan updated" };
}

export async function deletePlanAction(id: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const plan = await prisma.recurringPlan.findUnique({
    where: { id },
    include: { _count: { select: { subscriptions: true, templates: true } } },
  });
  if (!plan) return { ok: false, message: "Plan not found" };

  if (plan._count.subscriptions > 0 || plan._count.templates > 0) {
    return {
      ok: false,
      message: `"${plan.name}" is used by ${plan._count.subscriptions} subscription(s) and ${plan._count.templates} template(s) and cannot be deleted.`,
    };
  }

  await prisma.recurringPlan.delete({ where: { id } });
  revalidatePath("/plans");
  return { ok: true, message: `Plan "${plan.name}" deleted` };
}
