import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN", "INTERNAL"]);
  return <PlaceholderPage title="Quotation Templates" owner="M4 (Sales)" description="Reusable quotation templates with a plan and product lines." />;
}
