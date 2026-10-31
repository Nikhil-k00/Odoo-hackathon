import { z } from "zod";

const dateString = z
  .string()
  .min(1, "Required")
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Invalid date");

export const templateLineSchema = z.object({
  productId: z.string().min(1, "Choose a product"),
  quantity: z.coerce.number().int("Whole number").min(1, "At least 1"),
});

export const templateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  validityDays: z.coerce.number().int("Whole number").min(1, "At least 1 day"),
  planId: z.string().min(1, "Choose a plan"),
  lines: z.array(templateLineSchema).min(1, "Add at least one product line"),
});
export type TemplateInput = z.infer<typeof templateSchema>;

export const subscriptionLineSchema = z.object({
  productId: z.string().min(1, "Choose a product"),
  variantId: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  quantity: z.coerce.number().int("Whole number").min(1, "At least 1"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
});

export const subscriptionSchema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    planId: z.string().min(1, "Choose a plan"),
    startDate: dateString,
    expirationDate: z.string().optional().nullable(),
    paymentTerms: z.string().trim().min(1, "Required").max(60),
    discountId: z.string().optional().nullable(),
    lines: z.array(subscriptionLineSchema).min(1, "Add at least one product line"),
  })
  .refine(
    (d) => !d.expirationDate || new Date(d.expirationDate) > new Date(d.startDate),
    { message: "Expiration must be after the start date", path: ["expirationDate"] }
  );
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

/** Flattens Zod issues into { "lines.0.quantity": "At least 1", ... } for inline errors. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };
