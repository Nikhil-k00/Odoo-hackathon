"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { taxSchema } from "@/features/catalog/schemas";
import type { ActionState } from "@/features/catalog/types";
import { formToObject, invalid } from "./shared";

export async function createTaxAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = taxSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const tax = await prisma.tax.create({ data: parsed.data });
  revalidatePath("/taxes");
  return { ok: true, message: `Tax "${tax.name}" created`, id: tax.id };
}

export async function updateTaxAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = taxSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await prisma.tax.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Tax not found" };

  await prisma.tax.update({ where: { id }, data: parsed.data });
  revalidatePath("/taxes");
  revalidatePath("/products");
  return { ok: true, message: "Tax updated" };
}

export async function deleteTaxAction(id: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const tax = await prisma.tax.findUnique({
    where: { id },
    include: { _count: { select: { products: true, lines: true } } },
  });
  if (!tax) return { ok: false, message: "Tax not found" };
  if (tax._count.products > 0 || tax._count.lines > 0) {
    return {
      ok: false,
      message: `"${tax.name}" is used by ${tax._count.products} product(s) and ${tax._count.lines} subscription line(s). Remove it from them first.`,
    };
  }

  await prisma.tax.delete({ where: { id } });
  revalidatePath("/taxes");
  return { ok: true, message: `Tax "${tax.name}" deleted` };
}
