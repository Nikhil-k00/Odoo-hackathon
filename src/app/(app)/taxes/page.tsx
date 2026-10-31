import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Taxes" owner="M3 (Catalog)" description="Tax rates such as GST 18%, used by products and subscription lines." />;
}
