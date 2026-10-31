import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logoutAction } from "@/lib/auth-actions";
import { statusVariant } from "@/features/subscriptions/status";
import { StatusActions } from "@/features/subscriptions/components/status-actions";

/** Customer portal: everything is filtered by the signed-in user's id on the server. */
export default async function PortalPage() {
  const session = await requireRole(["PORTAL"]);
  const [subs, invoices] = await Promise.all([
    prisma.subscription.findMany({
      where: { customerId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { plan: true, lines: { include: { product: true, variant: true } } },
    }),
    prisma.invoice.findMany({ where: { customerId: session.userId }, orderBy: { periodStart: "desc" } }),
  ]);
  const today = new Date();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session.name}</h1>
          <p className="text-sm text-muted-foreground">Your subscriptions and invoices with Recurra.</p>
        </div>
        <form action={logoutAction}><Button type="submit" variant="outline" size="sm">Logout</Button></form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My subscriptions</CardTitle>
          <CardDescription>Accept quotations, and pause or close when your plan allows it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {subs.length === 0 && <p className="text-sm text-muted-foreground">You have no subscriptions yet.</p>}
          {subs.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.number}</span>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.plan.name} · {formatINR(s.plan.price)} / {s.plan.billingPeriod.toLowerCase()} · starts {formatDate(s.startDate)}
                  {s.nextBillingDate && ` · next bill ${formatDate(s.nextBillingDate)}`}
                  {s.status === "QUOTATION" && s.quoteValidUntil && ` · quote valid until ${formatDate(s.quoteValidUntil)}`}
                </p>
                <ul className="text-sm">
                  {s.lines.map((l) => (
                    <li key={l.id}>{l.quantity} × {l.product.name}{l.variant ? ` (${l.variant.value})` : ""} — {formatINR(l.amount)}</li>
                  ))}
                </ul>
              </div>
              <StatusActions id={s.id} status={s.status} plan={{ pausable: s.plan.pausable, closable: s.plan.closable }} portal />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My invoices</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {invoices.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No invoices yet.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Number</TableHead><TableHead>Period</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Outstanding</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const overdue = inv.status === "CONFIRMED" && inv.dueDate < today && inv.amountPaid < inv.total;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium"><Link href={`/portal/invoices/${inv.id}`} className="hover:underline">{inv.number}</Link></TableCell>
                      <TableCell>{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</TableCell>
                      <TableCell>{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="flex gap-1">
                        <Badge variant={inv.status === "PAID" ? "default" : "secondary"}>{inv.status}</Badge>
                        {overdue && <Badge variant="destructive">Overdue</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{formatINR(inv.total)}</TableCell>
                      <TableCell className="text-right">{formatINR(inv.total - inv.amountPaid)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
