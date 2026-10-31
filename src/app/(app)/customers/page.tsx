import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Customers" owner="M2 (Auth, Users, Dashboard, Reports)" description="Portal customers: list, search, create and edit with GSTIN checks." />;
}
