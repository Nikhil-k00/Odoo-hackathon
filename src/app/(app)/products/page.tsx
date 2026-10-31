import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Products" owner="M3 (Catalog)" description="Products with variants, prices and tax; variant extra price adds to the sales price." />;
}
