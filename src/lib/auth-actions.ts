"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/session";

/** Logs the current user out (used by the sidebar). */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
