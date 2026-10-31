import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Reports" owner="M2 (Auth, Users, Dashboard, Reports)" description="Revenue and subscription metrics with date, plan and status filters." />;
}
