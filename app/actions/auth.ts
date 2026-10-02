"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { logLoginAttempt } from "@/lib/db";
import type { SessionRole } from "@/lib/auth-token";

export type LoginState = { error: string } | undefined;

function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? null;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const viewerPassword = process.env.AUTH_PASSWORD;
  if (!adminPassword && !viewerPassword) {
    return { error: "サーバー側で ADMIN_PASSWORD / AUTH_PASSWORD が設定されていません" };
  }

  const password = formData.get("password");
  let role: SessionRole | null = null;
  if (typeof password === "string" && password) {
    if (adminPassword && passwordsMatch(password, adminPassword)) {
      role = "admin";
    } else if (viewerPassword && passwordsMatch(password, viewerPassword)) {
      role = "viewer";
    }
  }

  const ip = await clientIp();
  logLoginAttempt(role, role !== null, ip);

  if (!role) {
    return { error: "パスワードが違います" };
  }

  await createSession(role);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
