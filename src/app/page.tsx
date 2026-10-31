import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/session";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(homeFor(session.role));
}
