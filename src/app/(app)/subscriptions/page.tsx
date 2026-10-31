import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubscriptionFilters } from "@/features/subscriptions/components/subscription-filters";
import { statusVariant, SUBSCRIPTION_STATUSES } from "@/features/subscriptions/status";

type Search = { q?: string; status?: string };

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole(["ADMIN", "INTERNAL"]);
  const { q, status } = await searchParams;
  const validStatus = SUBSCRIPTION_STATUSES.find((s) => s === status);

  const subs = await prisma.subscription.findMany({
    where: {
      ...(validStatus ? { status: validStatus } : {}),
      ...(q ? { OR: [{ number: { contains: q } }, { customer: { name: { contains: q } } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } }, plan: { select: { name: true } }, lines: { select: { amount: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Draft → Quotation → Confirmed → Active → Closed</p>
        </div>
        <Link href="/subscriptions/new" className={buttonVariants()}><Plus className="h-4 w-4" /> New subscription</Link>
      </div>
      <SubscriptionFilters />

      {subs.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">{q || validStatus ? "No subscriptions match these filters." : "No subscriptions yet."}</p>
          {!q && !validStatus && <Link href="/subscriptions/new" className={buttonVariants({ variant: "outline" })}>Create first subscription</Link>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Plan</TableHead>
              <TableHead>Status</TableHead><TableHead>Start</TableHead><TableHead>Next billing</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium"><Link href={`/subscriptions/${s.id}`} className="hover:underline">{s.number}</Link></TableCell>
                  <TableCell>{s.customer.name}</TableCell>
                  <TableCell>{s.plan.name}</TableCell>
                  <TableCell><Badge variant={statusVariant(s.status)}>{s.status}</Badge></TableCell>
                  <TableCell>{formatDate(s.startDate)}</TableCell>
                  <TableCell>{formatDate(s.nextBillingDate)}</TableCell>
                  <TableCell className="text-right">{formatINR(s.lines.reduce((a, l) => a + l.amount, 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
