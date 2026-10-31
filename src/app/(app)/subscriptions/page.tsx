import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Subscriptions" owner="M4 (Sales)" description="Subscriptions with lines, status flow (Draft to Closed) and an audit timeline." />;
}
