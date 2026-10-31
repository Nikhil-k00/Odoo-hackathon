import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/session";
import { formatINR, round2 } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSubscriptionDetail } from "@/features/subscriptions/queries";
import { canEditLines, statusVariant } from "@/features/subscriptions/status";
import { StatusActions } from "@/features/subscriptions/components/status-actions";
import { Timeline } from "@/features/subscriptions/components/timeline";

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const { id } = await params;
  const sub = await getSubscriptionDetail(id);
  if (!sub) notFound();

  const subtotal = sub.lines.reduce((a, l) => a + l.amount, 0);
  const taxTotal = sub.lines.reduce((a, l) => a + l.amount * ((l.tax?.percent ?? 0) / 100), 0);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{sub.number}</h1>
            <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{sub.customer.name} · {sub.plan.name} plan · {sub.paymentTerms}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditLines(sub.status) && (
            <Link href={`/subscriptions/${sub.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}><Pencil className="h-4 w-4" /> Edit</Link>
          )}
          <StatusActions id={sub.id} status={sub.status} plan={{ pausable: sub.plan.pausable, closable: sub.plan.closable }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead><TableHead>Variant</TableHead><TableHead>Tax</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sub.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.product.name}</TableCell>
                    <TableCell>{l.variant ? `${l.variant.attribute}: ${l.variant.value}` : "-"}</TableCell>
                    <TableCell>{l.tax ? `${l.tax.name}` : "-"}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{formatINR(l.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatINR(l.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col items-end gap-1 p-4 text-sm">
              <p>Subtotal <span className="ml-4 font-medium">{formatINR(subtotal)}</span></p>
              {sub.discount && <p className="text-muted-foreground">Discount {sub.discount.name} ({sub.discount.type === "PERCENT" ? `${sub.discount.value}%` : formatINR(sub.discount.value)}) applied at billing</p>}
              <p className="text-muted-foreground">Tax <span className="ml-4">{formatINR(round2(taxTotal))}</span></p>
              <p className="text-base font-semibold">Per period <span className="ml-4">{formatINR(round2(subtotal + taxTotal))}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Customer" value={`${sub.customer.name} (${sub.customer.email})`} />
            <Row label="State" value={sub.customer.state ?? "-"} />
            <Row label="GSTIN" value={sub.customer.gstin ?? "-"} />
            <Row label="Plan" value={`${sub.plan.name} · ${formatINR(sub.plan.price)} / ${sub.plan.billingPeriod.toLowerCase()}`} />
            <Row label="Start" value={formatDate(sub.startDate)} />
            <Row label="Expires" value={formatDate(sub.expirationDate)} />
            <Row label="Quote valid until" value={formatDate(sub.quoteValidUntil)} />
            <Row label="Next billing" value={formatDate(sub.nextBillingDate)} />
            <Row label="Payment terms" value={sub.paymentTerms} />
            <div className="flex flex-wrap gap-1 pt-1">
              {sub.plan.pausable && <Badge variant="outline">pausable</Badge>}
              {sub.plan.closable && <Badge variant="outline">closable</Badge>}
              {sub.plan.autoClose && <Badge variant="outline">auto-close</Badge>}
              {sub.plan.renewable && <Badge variant="outline">renewable</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Every create, edit and status change is logged.</CardDescription>
          </CardHeader>
          <CardContent><Timeline logs={sub.logs} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Generated by the billing run (read-only here).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {sub.invoices.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No invoices yet. Activate the subscription and run billing.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Number</TableHead><TableHead>Period</TableHead><TableHead>Due</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sub.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium"><Link href={`/invoices/${inv.id}`} className="hover:underline">{inv.number}</Link></TableCell>
                      <TableCell>{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</TableCell>
                      <TableCell>{formatDate(inv.dueDate)}</TableCell>
                      <TableCell><Badge variant={inv.status === "PAID" ? "default" : inv.status === "CANCELLED" ? "destructive" : "secondary"}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatINR(inv.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
