import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await requireRole(["ADMIN", "INTERNAL"]);

  const [users, subscriptions, invoices] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.invoice.count(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session.name}. Signed in as {session.role}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{users}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Subscriptions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{subscriptions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Invoices</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{invoices}</p></CardContent>
        </Card>
      </div>
      <div className="flex gap-2">
        <Link href="/reports" className={buttonVariants({ variant: "outline" })}>Reports</Link>
        <Link href="/users" className={buttonVariants({ variant: "outline" })}>Users</Link>
      </div>
    </div>
  );
}
