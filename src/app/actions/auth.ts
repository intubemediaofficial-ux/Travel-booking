"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export type FormState = { error?: string; ok?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Invalid email or password" };
  if (user.blocked) return { error: "Your account has been suspended. Please contact support." };
  await createSession(user.id);
  const next = safeNext(fd.get("next"));
  redirect(next === "/" && user.role === "ADMIN" ? "/admin" : next);
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^[+]?[0-9 ]{10,15}$/, "Enter a valid mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signupAction(_: FormState, fd: FormData): Promise<FormState> {
  const p = signupSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (await prisma.user.findUnique({ where: { email: p.data.email } })) return { error: "An account with this email already exists. Please login." };
  const user = await prisma.user.create({
    data: { name: p.data.name, email: p.data.email, phone: p.data.phone, passwordHash: await bcrypt.hash(p.data.password, 10) },
  });
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const resetSecret = () => new TextEncoder().encode((process.env.AUTH_SECRET || "dev-insecure-secret") + ":reset");

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const s = await getSettings();
  if (user) {
    const token = await new SignJWT({ sub: user.id, h: user.passwordHash.slice(-12) })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(resetSecret());
    const url = `${process.env.SITE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    const sent = await sendMail(email, `${s.siteName} password reset`, `<p>Hi ${user.name},</p><p>Click below to reset your password (valid for 1 hour):</p><p><a href="${url}">${url}</a></p>`);
    if (!sent) return { error: `Email service is not configured yet. Please contact ${s.supportEmail} / ${s.supportPhone} to reset your password.` };
  }
  return { ok: "If an account exists for this email, a reset link has been sent." };
}

export async function resetAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  try {
    const { payload } = await jwtVerify(token, resetSecret());
    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user || user.passwordHash.slice(-12) !== payload.h) return { error: "This reset link has already been used" };
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  } catch {
    return { error: "Reset link is invalid or expired" };
  }
  redirect("/login?reset=1");
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser("/account");
  const name = String(fd.get("name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  if (name.length < 2) return { error: "Please enter your name" };
  await prisma.user.update({ where: { id: u.id }, data: { name, phone: phone || null } });
  revalidatePath("/account");
  return { ok: "Profile updated" };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser("/account");
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (!(await bcrypt.compare(current, u.passwordHash))) return { error: "Current password is incorrect" };
  if (next.length < 6) return { error: "New password must be at least 6 characters" };
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Password changed" };
}

export async function addTravellerAction(fd: FormData) {
  const u = await requireUser("/account");
  const name = String(fd.get("name") ?? "").trim();
  const age = Number(fd.get("age"));
  const gender = String(fd.get("gender") ?? "Male");
  if (name.length < 2 || !(age > 0 && age < 120)) return;
  await prisma.savedTraveller.create({ data: { userId: u.id, name, age, gender } });
  revalidatePath("/account");
}

export async function removeTravellerAction(fd: FormData) {
  const u = await requireUser("/account");
  await prisma.savedTraveller.deleteMany({ where: { id: String(fd.get("id")), userId: u.id } });
  revalidatePath("/account");
}
