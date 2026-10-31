import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logoutAction } from "@/lib/auth-actions";
import { requireRole } from "@/lib/session";

// Placeholder owned by M4 (Sales). Replace with the real customer portal.
export default async function PortalPage() {
  const session = await requireRole(["PORTAL"]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Portal</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.name} <Badge variant="secondary">{session.role}</Badge>
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Logout
          </Button>
        </form>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Your subscriptions and invoices will appear here (owned by M4).</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Customers only ever see their own data, filtered by the signed-in user on the server.
        </CardContent>
      </Card>
    </div>
  );
}
