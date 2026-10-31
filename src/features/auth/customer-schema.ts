import { z } from "zod";

/** Indian GSTIN: 2-digit state code, PAN (5 letters, 4 digits, 1 letter), entity code, 'Z', checksum. */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const PASSWORD_RULES = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[a-z]/, "Needs a lowercase letter")
  .regex(/[^A-Za-z0-9]/, "Needs a special character");

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(20).regex(/^[0-9+\-\s()]*$/, "Digits, spaces, + ( ) - only").optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || GSTIN_REGEX.test(v), "GSTIN format is 22AAAAA0000A1Z5"),
  password: z.string().optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export type CustomerResult =
  | { ok: true; id: string; tempPassword?: string }
  | { ok: false; errors: Record<string, string> };

