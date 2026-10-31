"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { customerSchema, PASSWORD_RULES, type CustomerInput, type CustomerResult } from "./customer-schema";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

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
