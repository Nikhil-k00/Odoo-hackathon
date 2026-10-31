import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Read-only invoice view for the customer who owns it. */
export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["PORTAL"]);
  const { id } = await params;
  const inv = await prisma.invoice.findFirst({
    where: { id, customerId: session.userId },
    include: { lines: true, subscription: { select: { number: true } }, customer: { select: { name: true, state: true, gstin: true, address: true } }, payments: true },
  });
  if (!inv) notFound();

  const kerala = inv.customer.state === "Kerala";
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{inv.number}</h1>
          <Badge variant={inv.status === "PAID" ? "default" : "secondary"}>{inv.status}</Badge>
        </div>
        <Link href="/portal" className={buttonVariants({ variant: "outline", size: "sm" })}>Back</Link>
      </div>
      <Card>
        <CardHeader><CardTitle>Invoice details</CardTitle></CardHeader>
        <CardContent className="grid gap-1 text-sm md:grid-cols-2">
          <p><span className="text-muted-foreground">Subscription:</span> {inv.subscription.number}</p>
          <p><span className="text-muted-foreground">Period:</span> {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</p>
          <p><span className="text-muted-foreground">Due date:</span> {formatDate(inv.dueDate)}</p>
          <p><span className="text-muted-foreground">Billed to:</span> {inv.customer.name}{inv.customer.gstin ? ` · ${inv.customer.gstin}` : ""}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Tax %</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {inv.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.description}</TableCell><TableCell className="text-right">{l.quantity}</TableCell>
                  <TableCell className="text-right">{formatINR(l.unitPrice)}</TableCell><TableCell className="text-right">{l.taxPercent}%</TableCell>
                  <TableCell className="text-right">{formatINR(l.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-col items-end gap-1 p-4 text-sm">
            <p>Subtotal <span className="ml-4 font-medium">{formatINR(inv.subtotal)}</span></p>
            {inv.discountTotal > 0 && <p className="text-muted-foreground">Discount <span className="ml-4">- {formatINR(inv.discountTotal)}</span></p>}
            {kerala ? (
              <>
                <p className="text-muted-foreground">CGST <span className="ml-4">{formatINR(inv.taxTotal / 2)}</span></p>
                <p className="text-muted-foreground">SGST <span className="ml-4">{formatINR(inv.taxTotal / 2)}</span></p>
              </>
            ) : (
              <p className="text-muted-foreground">IGST <span className="ml-4">{formatINR(inv.taxTotal)}</span></p>
            )}
            <p className="text-base font-semibold">Total <span className="ml-4">{formatINR(inv.total)}</span></p>
            <p>Paid <span className="ml-4">{formatINR(inv.amountPaid)}</span></p>
            <p className="font-medium">Outstanding <span className="ml-4">{formatINR(inv.total - inv.amountPaid)}</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
