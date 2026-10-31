import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Billing Run" owner="M5 (Billing)" description="Bill as of a date: dry-run preview, then commit. Running twice never double bills." />;
}
