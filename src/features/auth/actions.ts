"use server";

import { redirect } from "next/navigation";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, homeFor, requireRole, type Role } from "@/lib/session";
import { createUserSchema, updateUserSchema } from "./schemas";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
  devResetUrl?: string;
};

function zodFieldErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

// Need import z type
import { z } from "zod";

function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  // block external schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return null;
  return v;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { ok: false, message: "Invalid email or password." };
  }

  await createSession({ id: user.id, role: user.role, name: user.name });

  const next = safeNext(String(formData.get("next") ?? ""));
  const target =
    next && (user.role === "ADMIN" || user.role === "INTERNAL" || user.role === "PORTAL")
      ? next
      : homeFor(user.role as Role);
  // Only allow internal next redirects; role home otherwise.
  redirect(target);
}

export async function signupAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    phone: formData.get("phone") ?? "",
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { name, email, password, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      fieldErrors: { email: ["An account with this email already exists."] },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "PORTAL",
      phone: phone ? phone : null,
    },
  });

  await createSession({ id: user.id, role: user.role, name: user.name });
  redirect("/portal");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = { email: formData.get("email") };
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  const generic = {
    ok: true,
    message:
      "If an account with that email exists, a password reset link has been generated.",
  };

  if (!user) {
    return generic;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: tokenHash, resetTokenExpiry: expiry },
  });

  const resetUrl = `/reset-password?token=${rawToken}`;

  if (process.env.NODE_ENV !== "production") {
    return { ...generic, devResetUrl: resetUrl };
  }
  return generic;
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { token, password } = parsed.data;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: { resetToken: tokenHash },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry <= new Date()) {
    return { ok: false, message: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  redirect("/login");
}
export async function createUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: "INTERNAL",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    state: formData.get("state") ?? "",
    gstin: formData.get("gstin") ?? "",
  };
  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false, fieldErrors: { email: ["Email already in use."] } };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "INTERNAL",
      phone: data.phone || null,
      address: data.address || null,
      state: data.state || null,
      gstin: data.gstin || null,
    },
  });

  return { ok: true, message: "Internal user created." };
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole(["ADMIN"]);

  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    state: formData.get("state") ?? "",
    gstin: formData.get("gstin") ?? "",
    role: formData.get("role") ?? undefined,
  };
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const dup = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: data.id } },
  });
  if (dup) {
    return { ok: false, fieldErrors: { email: ["Email already in use."] } };
  }

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    address: data.address || null,
    state: data.state || null,
    gstin: data.gstin || null,
  };
  if (data.role) {
    updateData.role = data.role;
  }

  await prisma.user.update({ where: { id: data.id }, data: updateData });
  return { ok: true, message: "User updated." };
}