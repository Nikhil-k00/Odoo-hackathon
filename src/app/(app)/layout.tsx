import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PORTAL") redirect("/portal");

  return (
    <div className="flex min-h-screen">
      <AppSidebar name={session.name} role={session.role} />
      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
