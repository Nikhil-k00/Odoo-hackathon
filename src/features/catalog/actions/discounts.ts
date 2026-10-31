"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { discountSchema, type DiscountInput } from "@/features/catalog/schemas";
import type { ActionState } from "@/features/catalog/types";
import { formToObject, invalid } from "./shared";

/** Products only matter when the discount applies to PRODUCT; verifies every id exists. */
async function resolveProductIds(input: DiscountInput): Promise<{ ids: string[] } | { error: ActionState }> {
  if (input.appliesTo !== "PRODUCT") return { ids: [] };
  const ids = Array.from(new Set(input.productIds));
  const found = await prisma.product.count({ where: { id: { in: ids } } });
  if (found !== ids.length) return { error: { ok: false, errors: { productIds: ["One of the selected products no longer exists"] } } };
  return { ids };
}

function toData(input: DiscountInput) {
  const { productIds: _productIds, ...rest } = input;
  void _productIds;
  return { ...rest, usageLimit: rest.usageLimit ?? null };
}

export async function createDiscountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = discountSchema.safeParse(formToObject(formData, ["productIds"]));
  if (!parsed.success) return invalid(parsed.error);

  const products = await resolveProductIds(parsed.data);
  if ("error" in products) return products.error;

  const discount = await prisma.discount.create({
    data: {
      ...toData(parsed.data),
      products: { create: products.ids.map((productId) => ({ productId })) },
    },
  });
  revalidatePath("/discounts");
  return { ok: true, message: `Discount "${discount.name}" created`, id: discount.id };
}

export async function updateDiscountAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = discountSchema.safeParse(formToObject(formData, ["productIds"]));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await prisma.discount.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Discount not found" };

  const products = await resolveProductIds(parsed.data);
  if ("error" in products) return products.error;

  // Replace the product links atomically with the field update.
  await prisma.$transaction([
    prisma.discountProduct.deleteMany({ where: { discountId: id } }),
    prisma.discount.update({
      where: { id },
      data: {
        ...toData(parsed.data),
        products: { create: products.ids.map((productId) => ({ productId })) },
      },
    }),
  ]);
  revalidatePath("/discounts");
  return { ok: true, message: "Discount updated" };
}

export async function deleteDiscountAction(id: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const discount = await prisma.discount.findUnique({
    where: { id },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (!discount) return { ok: false, message: "Discount not found" };

  if (discount._count.subscriptions > 0) {
    return {
      ok: false,
      message: `"${discount.name}" is applied to ${discount._count.subscriptions} subscription(s) and cannot be deleted. Let it expire instead.`,
    };
  }

  await prisma.discount.delete({ where: { id } }); // DiscountProduct rows cascade
  revalidatePath("/discounts");
  return { ok: true, message: `Discount "${discount.name}" deleted` };
}
