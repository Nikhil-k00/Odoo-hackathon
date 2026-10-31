import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "INTERNAL" | "PORTAL";
export type Session = { userId: string; role: Role; name: string };

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;
const ROLES: Role[] = ["ADMIN", "INTERNAL", "PORTAL"];

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) {
    console.warn("JWT_SECRET is not set; using an insecure development fallback.");
  }
  return new TextEncoder().encode(s ?? "recurra-insecure-dev-fallback-secret");
}

/** Signs a JWT for the user and stores it in the httpOnly `session` cookie. */
export async function createSession(user: { id: string; role: string; name: string }): Promise<void> {
  const token = await new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/** Reads and verifies the session cookie. Returns null when missing or invalid. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role as string;
    if (!payload.sub || !ROLES.includes(role as Role)) return null;
    return { userId: payload.sub, role: role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

/** Removes the session cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Home route for a role. */
export function homeFor(role: Role): string {
  return role === "PORTAL" ? "/portal" : "/dashboard";
}

/**
 * Guard for pages and Server Actions.
 * Not logged in -> redirect to /login. Logged in with a disallowed role -> redirect to that role's home.
 */
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) redirect(homeFor(session.role));
  return session;
}
