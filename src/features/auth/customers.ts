"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

/** Indian GSTIN: 2-digit state code, PAN (5 letters, 4 digits, 1 letter), entity code, 'Z', checksum. */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const PASSWORD_RULES = z
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

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/** Create (id = null) or update a PORTAL customer. ADMIN and INTERNAL only. */
export async function saveCustomer(id: string | null, input: CustomerInput): Promise<CustomerResult> {
  await requireRole(["ADMIN", "INTERNAL"]);
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const d = parsed.data;

  const clash = await prisma.user.findUnique({ where: { email: d.email } });
  if (clash && clash.id !== id) return { ok: false, errors: { email: "An account with this email already exists" } };

  const base = {
    name: d.name,
    email: d.email,
    phone: d.phone || null,
    address: d.address || null,
    state: d.state || null,
    gstin: d.gstin || null,
  };

  if (id) {
    const existing = await prisma.user.findFirst({ where: { id, role: "PORTAL" } });
    if (!existing) return { ok: false, errors: { _form: "Customer not found" } };
    const data: typeof base & { passwordHash?: string } = { ...base };
    if (d.password) {
      const pw = PASSWORD_RULES.safeParse(d.password);
      if (!pw.success) return { ok: false, errors: { password: pw.error.issues[0].message } };
      data.passwordHash = await bcrypt.hash(d.password, 10);
    }
    await prisma.user.update({ where: { id }, data });
    revalidatePath("/customers");
    return { ok: true, id };
  }

  // Create: use the given password or generate a temporary one the staff member can share.
  let tempPassword: string | undefined;
  let password = d.password || "";
  if (password) {
    const pw = PASSWORD_RULES.safeParse(password);
    if (!pw.success) return { ok: false, errors: { password: pw.error.issues[0].message } };
  } else {
    tempPassword = `Rc!${randomBytes(4).toString("hex")}A1`;
    password = tempPassword;
  }
  const user = await prisma.user.create({
    data: { ...base, role: "PORTAL", passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/customers");
  return { ok: true, id: user.id, tempPassword };
}
