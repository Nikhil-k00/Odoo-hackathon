"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { runBilling } from "./engine";
import { round2 } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const dateSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Invalid date format",
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  method: z.enum(["UPI", "CARD", "BANK", "CASH"]),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid payment date",
  }),
  note: z.string().optional(),
});

export async function previewBillingAction(asOfDateStr: string) {
  await requireRole(["ADMIN", "INTERNAL"]);

  const parsed = dateSchema.safeParse(asOfDateStr);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid date" };
  }

  const asOfDate = new Date(parsed.data);
  const result = await runBilling(asOfDate, "DRY");
  return { success: true, data: result };
}

export async function commitBillingAction(asOfDateStr: string) {
  // Commit is ADMIN ONLY as per specification
  const session = await requireRole(["ADMIN"]);

  const parsed = dateSchema.safeParse(asOfDateStr);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid date" };
  }

  const asOfDate = new Date(parsed.data);
  const result = await runBilling(asOfDate, "COMMIT", session.userId);

  revalidatePath("/billing");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { success: true, data: result };
}

export async function confirmInvoiceAction(invoiceId: string) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  if (invoice.status !== "DRAFT") {
    return { success: false, error: `Cannot confirm invoice with status ${invoice.status}` };
  }

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CONFIRMED" },
    }),
    prisma.auditLog.create({
      data: {
        entity: "Invoice",
        entityId: invoiceId,
        action: "CONFIRM",
        details: `Invoice ${invoice.number} confirmed`,
        actorId: session.userId,
        subscriptionId: invoice.subscriptionId,
      },
    }),
  ]);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { success: true };
}

export async function cancelInvoiceAction(invoiceId: string) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  if (invoice.status === "CANCELLED" || invoice.status === "PAID") {
    return { success: false, error: `Cannot cancel an invoice that is ${invoice.status}` };
  }

  if (invoice.payments.length > 0) {
    return { success: false, error: "Cannot cancel an invoice with recorded payments" };
  }

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELLED" },
    }),
    prisma.auditLog.create({
      data: {
        entity: "Invoice",
        entityId: invoiceId,
        action: "CANCEL",
        details: `Invoice ${invoice.number} cancelled`,
        actorId: session.userId,
        subscriptionId: invoice.subscriptionId,
      },
    }),
  ]);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { success: true };
}

export async function sendInvoiceAction(invoiceId: string) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  // Offline send: log in AuditLog
  await prisma.auditLog.create({
    data: {
      entity: "Invoice",
      entityId: invoiceId,
      action: "SEND",
      details: `Invoice ${invoice.number} marked as sent to ${invoice.customer.email}`,
      actorId: session.userId,
      subscriptionId: invoice.subscriptionId,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true, message: `Invoice sent to ${invoice.customer.email}` };
}

export async function recordPaymentAction(rawData: {
  invoiceId: string;
  method: string;
  amount: number;
  paymentDate: string;
  note?: string;
}) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);

  const parsed = paymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { invoiceId, method, amount, paymentDate, note } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  if (invoice.status === "CANCELLED") {
    return { success: false, error: "Cannot record payment on a cancelled invoice" };
  }

  if (invoice.status === "PAID") {
    return { success: false, error: "Invoice is already fully paid" };
  }

  const outstanding = round2(invoice.total - invoice.amountPaid);
  if (amount > outstanding + 0.001) {
    return {
      success: false,
      error: `Payment amount (${amount}) cannot exceed outstanding amount (${outstanding})`,
    };
  }

  const newAmountPaid = round2(invoice.amountPaid + amount);
  const isFullyPaid = newAmountPaid >= invoice.total - 0.001;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        method,
        amount: round2(amount),
        paymentDate: new Date(paymentDate),
        note: note?.trim() || null,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: isFullyPaid ? "PAID" : invoice.status === "DRAFT" ? "CONFIRMED" : invoice.status,
      },
    }),
    prisma.auditLog.create({
      data: {
        entity: "Payment",
        entityId: invoiceId,
        action: "RECORD_PAYMENT",
        details: `Recorded ${method} payment of ₹${amount}. New status: ${isFullyPaid ? "PAID" : "PARTIALLY_PAID"}`,
        actorId: session.userId,
        subscriptionId: invoice.subscriptionId,
      },
    }),
  ]);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { success: true, isFullyPaid };
}
