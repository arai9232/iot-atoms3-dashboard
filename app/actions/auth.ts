"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error: string } | undefined;

function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    return { error: "サーバー側で AUTH_PASSWORD が設定されていません" };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !passwordsMatch(password, expected)) {
    return { error: "パスワードが違います" };
  }

  await createSession();
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
