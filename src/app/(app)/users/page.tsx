import { PlaceholderPage } from "@/components/placeholder-page";
import { requireRole } from "@/lib/session";

export default async function Page() {
  await requireRole(["ADMIN"]);
  return <PlaceholderPage title="Users" owner="M2 (Auth, Users, Dashboard, Reports)" description="All users with role badges; admin creates internal staff accounts." />;
}
