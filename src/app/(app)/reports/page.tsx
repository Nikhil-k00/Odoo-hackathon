import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  await requireRole(["ADMIN", "INTERNAL"]);

  const [
    totalUsers,
    adminCount,
    internalCount,
    portalCount,
    totalSubscriptions,
    activeSubscriptions,
    totalInvoices,
    paidInvoices,
    revenueAgg,
    outstandingAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "INTERNAL" } }),
    prisma.user.count({ where: { role: "PORTAL" } }),
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: "PAID" } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: { in: ["DRAFT", "CONFIRMED"] } } }),
  ]);

  const revenue = revenueAgg._sum.total ?? 0;
  const outstanding = outstandingAgg._sum.total ?? 0;

  const stats: { label: string; value: string | number }[] = [
    { label: "Total users", value: totalUsers },
    { label: "Admins", value: adminCount },
    { label: "Internal staff", value: internalCount },
    { label: "Portal customers", value: portalCount },
    { label: "Total subscriptions", value: totalSubscriptions },
    { label: "Active subscriptions", value: activeSubscriptions },
    { label: "Total invoices", value: totalInvoices },
    { label: "Paid invoices", value: paidInvoices },
    { label: "Revenue (paid)", value: `₹${revenue.toFixed(2)}` },
    { label: "Outstanding", value: `₹${outstanding.toFixed(2)}` },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {totalUsers === 0 && (
        <p className="text-sm text-muted-foreground">No data available yet.</p>
      )}
    </div>
  );
}
