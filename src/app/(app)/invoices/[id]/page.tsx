import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { notFound } from "next/navigation";
import { InvoiceDetailClient } from "./invoice-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await requireRole(["ADMIN", "INTERNAL"]);
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      subscription: true,
      lines: true,
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <div className="p-6">
      <InvoiceDetailClient invoice={invoice} currentUserRole={session.role} />
    </div>
  );
}

