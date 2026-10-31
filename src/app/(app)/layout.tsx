import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { getSession } from "@/lib/session";

/** The app "window": a white rounded surface floating on the sage canvas, with the dark icon rail inside. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PORTAL") redirect("/portal");

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-[1680px] overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_90px_-40px_rgba(20,20,20,0.45)] sm:min-h-[calc(100vh-2rem)] sm:rounded-[2rem] lg:min-h-[calc(100vh-3rem)]">
        <AppSidebar name={session.name} role={session.role} />
        <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
