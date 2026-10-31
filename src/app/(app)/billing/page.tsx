import { requireRole } from "@/lib/session";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const session = await requireRole(["ADMIN", "INTERNAL"]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Billing Run</h1>
        <p className="text-muted-foreground">
          Run automated billing cycles with time-machine simulations, idempotency checks, and GST auto-splitting.
        </p>
      </div>

      <BillingClient userRole={session.role} />
    </div>
  );
}
