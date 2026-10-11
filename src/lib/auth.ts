import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE = "tb_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret");

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "0",
    path: "/",
    maxAge: 30 * 86400,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.blocked) return null;
    return user;
  } catch {
    return null;
  }
});

export async function requireUser(next = "/") {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await getUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}
