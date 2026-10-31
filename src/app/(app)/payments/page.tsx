import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
  await requireRole(["ADMIN", "INTERNAL"]);

  const payments = await prisma.payment.findMany({
    orderBy: { paymentDate: "desc" },
    include: {
      invoice: {
        select: {
          id: true,
          number: true,
          total: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Payments</h1>
        <p className="text-muted-foreground">
          View all incoming revenue transactions, payment methods, and ledger receipts.
        </p>
      </div>

      <PaymentsClient initialPayments={payments} />
    </div>
  );
}
