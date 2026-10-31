import { z } from "zod";

/** "" / null -> undefined so required fields report "Required" instead of coercing to 0 / Invalid Date. */
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** Required number from a text input; `rules` adds range checks (min/max/int...). */
const num = (label: string, rules: (n: z.ZodNumber) => z.ZodNumber = (n) => n) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({
      error: (iss) => (iss.input === undefined ? `${label} is required` : `${label} must be a number`),
    })
  ).pipe(rules(z.number()));

/** Number input that may be left blank; blank becomes `fallback`. */
const numOr = (label: string, fallback: number, rules: (n: z.ZodNumber) => z.ZodNumber = (n) => n) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? fallback : v),
    z.coerce.number({ error: `${label} must be a number` })
  ).pipe(rules(z.number()));

/** Required date from an <input type="date">. */
const date = (label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.date({
      error: (iss) => (iss.input === undefined ? `${label} is required` : `${label} is not a valid date`),
    })
  );

/** Optional date; blank is allowed. */
const optionalDate = (label: string) =>
  z.preprocess(blankToUndefined, z.coerce.date({ error: `${label} is not a valid date` }).optional());

/** Hidden inputs / checkboxes send "true" | "false" | "on" | undefined. */
const bool = z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean());

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `Must be ${max} characters or less`).optional());

const name = z
  .string({ error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(80, "Name must be 80 characters or less");

// ---------------------------------------------------------------- Taxes

export const taxSchema = z.object({
  name,
  percent: num("Percent", (n) => n.min(0, "Percent must be between 0 and 100").max(100, "Percent must be between 0 and 100")),
});
export type TaxInput = z.infer<typeof taxSchema>;

// ------------------------------------------------------------- Products

export const PRODUCT_TYPES = ["SERVICE", "GOODS"] as const;

export const productSchema = z.object({
  name,
  type: z.enum(PRODUCT_TYPES, { error: "Choose a product type" }),
  salesPrice: num("Sales price", (n) => n.min(0, "Sales price cannot be negative")),
  costPrice: num("Cost price", (n) => n.min(0, "Cost price cannot be negative")),
  notes: optionalText(500),
  // "" (no tax) -> undefined -> stored as null
  taxId: z.preprocess(blankToUndefined, z.string().optional()),
  active: bool,
});
export type ProductInput = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  attribute: z
    .string({ error: "Attribute is required" })
    .trim()
    .min(1, "Attribute is required")
    .max(40, "Attribute must be 40 characters or less"),
  value: z
    .string({ error: "Value is required" })
    .trim()
    .min(1, "Value is required")
    .max(40, "Value must be 40 characters or less"),
  extraPrice: numOr("Extra price", 0),
});
export type VariantInput = z.infer<typeof variantSchema>;

// ---------------------------------------------------------------- Plans

export const BILLING_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const planSchema = z
  .object({
    name,
    price: num("Price", (n) => n.min(0, "Price cannot be negative")),
    billingPeriod: z.enum(BILLING_PERIODS, { error: "Choose a billing period" }),
    minQuantity: num("Minimum quantity", (n) => n.int("Minimum quantity must be a whole number").min(1, "Minimum quantity must be at least 1")),
    startDate: date("Start date"),
    endDate: optionalDate("End date"),
    autoClose: bool,
    closable: bool,
    pausable: bool,
    renewable: bool,
  })
  .refine((p) => !p.endDate || p.endDate > p.startDate, {
    path: ["endDate"],
    message: "End date must be after the start date",
  });
export type PlanInput = z.infer<typeof planSchema>;

// ------------------------------------------------------------ Discounts

export const DISCOUNT_TYPES = ["FIXED", "PERCENT"] as const;
export const DISCOUNT_APPLIES_TO = ["PRODUCT", "SUBSCRIPTION"] as const;

export const discountSchema = z
  .object({
    name,
    type: z.enum(DISCOUNT_TYPES, { error: "Choose a discount type" }),
    value: num("Value", (n) => n.gt(0, "Value must be greater than 0")),
    minPurchase: numOr("Minimum purchase", 0, (n) => n.min(0, "Minimum purchase cannot be negative")),
    minQuantity: numOr("Minimum quantity", 1, (n) =>
      n.int("Minimum quantity must be a whole number").min(1, "Minimum quantity must be at least 1")
    ),
    startDate: date("Start date"),
    endDate: date("End date"),
    usageLimit: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ error: "Usage limit must be a number" })
        .int("Usage limit must be a whole number")
        .min(1, "Usage limit must be at least 1")
        .optional()
    ),
    appliesTo: z.enum(DISCOUNT_APPLIES_TO, { error: "Choose what the discount applies to" }),
    productIds: z.array(z.string().min(1)).default([]),
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 100, {
    path: ["value"],
    message: "A percentage discount cannot exceed 100",
  })
  .refine((d) => d.endDate > d.startDate, {
    path: ["endDate"],
    message: "End date must be after the start date",
  })
  .refine((d) => d.appliesTo !== "PRODUCT" || d.productIds.length > 0, {
    path: ["productIds"],
    message: "Select at least one product",
  });
export type DiscountInput = z.infer<typeof discountSchema>;
