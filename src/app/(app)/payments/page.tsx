import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Payments" owner="M5 (Billing)" description="Payments recorded against invoices by UPI, card, bank or cash." />;
}
