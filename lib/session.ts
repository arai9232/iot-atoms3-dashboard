import "server-only";
import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";

export async function createSession() {
  const { token, expiresAt } = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
