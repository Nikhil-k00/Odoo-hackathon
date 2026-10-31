import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Recurring Plans" owner="M3 (Catalog)" description="Daily, weekly, monthly and yearly plans with auto-close, pause and renew options." />;
}
