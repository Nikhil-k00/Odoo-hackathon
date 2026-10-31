import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Invoices" owner="M5 (Billing)" description="Invoices with GST split, overdue badges, confirm, cancel, send and print actions." />;
}
