import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
  await requireRole(["ADMIN", "INTERNAL"]);

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: { id: true, name: true, state: true },
      },
      subscription: {
        select: { id: true, number: true },
      },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">
          View all system invoices, status tracking, GST breakdowns, and payment statuses.
        </p>
      </div>

      <InvoicesClient initialInvoices={invoices} />
    </div>
  );
}
