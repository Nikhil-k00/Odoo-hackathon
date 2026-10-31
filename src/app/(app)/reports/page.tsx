import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR, round2 } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Search = { from?: string; to?: string; planId?: string; status?: string };
const STATUSES = ["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"];

function monthly(price: number, period: string): number {
  switch (period) {
    case "DAILY": return price * 30;
    case "WEEKLY": return (price * 52) / 12;
    case "YEARLY": return price / 12;
    default: return price;
  }
}
const parseDate = (s?: string, endOfDay = false) => {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const sp = await searchParams;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to, true);
  const planId = sp.planId || undefined;
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const now = new Date();

  const dateRange = from || to ? { gte: from, lte: to } : undefined;
  const subFilter = { ...(planId ? { planId } : {}), ...(status ? { status } : {}) };
  const invoiceScope = { ...(dateRange ? { periodStart: dateRange } : {}), ...(planId || status ? { subscription: subFilter } : {}) };

  const [plans, byStatus, activeSubs, invoiced, paymentsAgg, confirmedAgg, overdueRows, payments] = await Promise.all([
    prisma.recurringPlan.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true }, where: planId ? { planId } : undefined }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", ...(planId ? { planId } : {}) },
      select: { plan: { select: { name: true, price: true, billingPeriod: true } }, lines: { select: { quantity: true } } },
    }),
    prisma.invoice.aggregate({ where: invoiceScope, _sum: { total: true, taxTotal: true, discountTotal: true }, _count: { _all: true } }),
    prisma.payment.aggregate({
      where: { ...(dateRange ? { paymentDate: dateRange } : {}), ...(planId || status ? { invoice: { subscription: subFilter } } : {}) },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({ where: { ...invoiceScope, status: "CONFIRMED" }, _sum: { total: true, amountPaid: true } }),
    prisma.invoice.findMany({
      where: { ...invoiceScope, status: "CONFIRMED", dueDate: { lt: now } },
      include: { customer: { select: { name: true } }, subscription: { select: { number: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { ...(dateRange ? { paymentDate: dateRange } : {}), ...(planId || status ? { invoice: { subscription: subFilter } } : {}) },
      include: { invoice: { select: { number: true, customer: { select: { name: true } } } } },
      orderBy: { paymentDate: "desc" },
      take: 50,
    }),
  ]);

  const overdue = overdueRows.filter((i) => i.amountPaid < i.total);
  const mrr = activeSubs.reduce((s, sub) => s + monthly(sub.plan.price, sub.plan.billingPeriod) * (sub.lines.reduce((q, l) => q + l.quantity, 0) || 1), 0);
  const mrrByPlan = new Map<string, { count: number; mrr: number }>();
  for (const sub of activeSubs) {
    const cur = mrrByPlan.get(sub.plan.name) ?? { count: 0, mrr: 0 };
    cur.count += 1;
    cur.mrr += monthly(sub.plan.price, sub.plan.billingPeriod) * (sub.lines.reduce((q, l) => q + l.quantity, 0) || 1);
    mrrByPlan.set(sub.plan.name, cur);
  }
  const outstanding = (confirmedAgg._sum.total ?? 0) - (confirmedAgg._sum.amountPaid ?? 0);
  const hasFilter = Boolean(sp.from || sp.to || planId || status);

  const kpis = [
    { label: "Active subscriptions", value: String(activeSubs.length) },
    { label: "MRR", value: formatINR(round2(mrr)) },
    { label: "Invoiced", value: formatINR(invoiced._sum.total ?? 0), hint: `${invoiced._count._all} invoices · tax ${formatINR(invoiced._sum.taxTotal ?? 0)} · discounts ${formatINR(invoiced._sum.discountTotal ?? 0)}` },
    { label: "Revenue collected", value: formatINR(paymentsAgg._sum.amount ?? 0), hint: `${paymentsAgg._count._all} payments` },
    { label: "Outstanding", value: formatINR(round2(outstanding)) },
    { label: "Overdue", value: String(overdue.length), hint: formatINR(round2(overdue.reduce((s, i) => s + i.total - i.amountPaid, 0))) },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Reports</h1>
        <p className="text-sm text-muted-foreground">Revenue, outstanding, overdue and MRR. Filters apply to invoice periods and payment dates.</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form method="get" className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
            <div className="flex flex-col gap-1.5"><Label htmlFor="from">From</Label><Input id="from" type="date" name="from" defaultValue={sp.from ?? ""} /></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="to">To</Label><Input id="to" type="date" name="to" defaultValue={sp.to ?? ""} /></div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planId">Plan</Label>
              <select id="planId" name="planId" defaultValue={planId ?? ""} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm">
                <option value="">All plans</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Subscription status</Label>
              <select id="status" name="status" defaultValue={status ?? ""} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm">
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Button type="submit">Apply</Button>
            {hasFilter && <Link href="/reports" className="text-sm underline">Clear</Link>}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2"><CardDescription>{k.label}</CardDescription></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
              {k.hint && <p className="text-xs text-muted-foreground">{k.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Subscriptions by status</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {STATUSES.map((s) => (
                  <TableRow key={s}><TableCell><Badge variant={s === "ACTIVE" ? "default" : "secondary"}>{s}</Badge></TableCell>
                    <TableCell className="text-right">{byStatus.find((b) => b.status === s)?._count._all ?? 0}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>MRR by plan</CardTitle><CardDescription>Active subscriptions only.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {mrrByPlan.size === 0 ? <p className="p-6 text-sm text-muted-foreground">No active subscriptions.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead className="text-right">Active</TableHead><TableHead className="text-right">MRR</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...mrrByPlan.entries()].map(([name, v]) => (
                    <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell className="text-right">{v.count}</TableCell><TableCell className="text-right">{formatINR(round2(v.mrr))}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Overdue invoices</CardTitle><CardDescription>Confirmed, past due date, not fully paid.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {overdue.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nothing overdue.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Subscription</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Days late</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
              <TableBody>
                {overdue.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium"><Link href={`/invoices/${i.id}`} className="hover:underline">{i.number}</Link></TableCell>
                    <TableCell>{i.customer.name}</TableCell><TableCell>{i.subscription.number}</TableCell><TableCell>{formatDate(i.dueDate)}</TableCell>
                    <TableCell className="text-right">{Math.floor((now.getTime() - i.dueDate.getTime()) / 86400000)}</TableCell>
                    <TableCell className="text-right">{formatINR(round2(i.total - i.amountPaid))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payments</CardTitle><CardDescription>Most recent 50 in the selected range.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {payments.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No payments recorded.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell><TableCell className="font-medium">{p.invoice.number}</TableCell>
                    <TableCell>{p.invoice.customer.name}</TableCell><TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
                    <TableCell className="text-right">{formatINR(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
