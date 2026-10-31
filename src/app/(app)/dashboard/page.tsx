import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Dashboard" owner="M2 (Auth, Users, Dashboard, Reports)" description="KPI cards: active subscriptions, revenue, outstanding, overdue and MRR, plus recent invoices." />;
}
