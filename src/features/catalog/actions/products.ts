"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { productSchema, variantSchema } from "@/features/catalog/schemas";
import type { ActionState } from "@/features/catalog/types";
import { formToObject, invalid } from "./shared";

/** Validates the chosen tax exists; returns an error state when it does not. */
async function checkTax(taxId: string | undefined): Promise<ActionState> {
  if (!taxId) return null;
  const tax = await prisma.tax.findUnique({ where: { id: taxId } });
  return tax ? null : { ok: false, errors: { taxId: ["Selected tax no longer exists"] } };
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = productSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const taxError = await checkTax(parsed.data.taxId);
  if (taxError) return taxError;

  const product = await prisma.product.create({
    data: { ...parsed.data, notes: parsed.data.notes ?? null, taxId: parsed.data.taxId ?? null },
  });
  revalidatePath("/products");
  return { ok: true, message: `Product "${product.name}" created`, id: product.id };
}

export async function updateProductAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = productSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Product not found" };

  const taxError = await checkTax(parsed.data.taxId);
  if (taxError) return taxError;

  await prisma.product.update({
    where: { id },
    data: { ...parsed.data, notes: parsed.data.notes ?? null, taxId: parsed.data.taxId ?? null },
  });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true, message: "Product updated" };
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { subscriptionLines: true, templateLines: true } } },
  });
  if (!product) return { ok: false, message: "Product not found" };

  const used = product._count.subscriptionLines + product._count.templateLines;
  if (used > 0) {
    return {
      ok: false,
      message: `"${product.name}" is used by ${product._count.subscriptionLines} subscription line(s) and ${product._count.templateLines} template line(s). Mark it inactive instead of deleting it.`,
    };
  }

  // Variants and DiscountProduct rows cascade.
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
  revalidatePath("/discounts");
  return { ok: true, message: `Product "${product.name}" deleted` };
}

// ------------------------------------------------------------- Variants

export async function addVariantAction(productId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const parsed = variantSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, message: "Product not found" };

  const duplicate = await prisma.productVariant.findFirst({
    where: { productId, attribute: parsed.data.attribute, value: parsed.data.value },
  });
  if (duplicate) {
    return { ok: false, errors: { value: [`${parsed.data.attribute} / ${parsed.data.value} already exists`] } };
  }

  await prisma.productVariant.create({ data: { productId, ...parsed.data } });
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return { ok: true, message: `Variant ${parsed.data.attribute} / ${parsed.data.value} added` };
}

export async function removeVariantAction(variantId: string): Promise<ActionState> {
  await requireRole(["ADMIN"]);
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { _count: { select: { lines: true } } },
  });
  if (!variant) return { ok: false, message: "Variant not found" };
  if (variant._count.lines > 0) {
    return {
      ok: false,
      message: `${variant.attribute} / ${variant.value} is used by ${variant._count.lines} subscription line(s) and cannot be removed.`,
    };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  revalidatePath(`/products/${variant.productId}`);
  revalidatePath("/products");
  return { ok: true, message: "Variant removed" };
}
