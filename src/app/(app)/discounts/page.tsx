import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN"]);
  return <PlaceholderPage title="Discounts" owner="M3 (Catalog)" description="Fixed or percentage discounts with validity, usage limits and product targeting." />;
}
