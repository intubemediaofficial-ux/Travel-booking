import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "./db";

export const REFERRAL_BONUS = 200;

export async function newReferralCode(name: string) {
  const base = name.replace(/[^a-z]/gi, "").slice(0, 5).toUpperCase() || "TRIP";
  for (let i = 0; i < 5; i++) {
    const code = base + randomBytes(2).toString("hex").toUpperCase();
    if (!(await prisma.user.findUnique({ where: { referralCode: code } }))) return code;
  }
  return "TRIP" + randomBytes(4).toString("hex").toUpperCase();
}

export async function ensureReferralCode(user: { id: string; name: string; referralCode: string | null }) {
  if (user.referralCode) return user.referralCode;
  const code = await newReferralCode(user.name);
  await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
  return code;
}
