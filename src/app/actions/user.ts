"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { razorpayEnabled } from "@/lib/payment";

export async function addMoneyAction(_: { error?: string; ok?: string } | undefined, fd: FormData) {
  const user = await requireUser("/wallet");
  if (razorpayEnabled()) return { error: "Online wallet top-up will be available soon" };
  const amount = Math.floor(Number(fd.get("amount")));
  if (!(amount >= 100 && amount <= 50000)) return { error: "Enter an amount between ₹100 and ₹50,000" };
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { walletBalance: { increment: amount } } }),
    prisma.walletTxn.create({ data: { userId: user.id, amount, kind: "TOPUP", note: `Added via ${String(fd.get("method") ?? "UPI")} (test mode)` } }),
  ]);
  revalidatePath("/wallet");
  return { ok: `₹${amount.toLocaleString("en-IN")} added to your wallet` };
}

export async function pnrAction(_: unknown, fd: FormData) {
  const pnr = String(fd.get("pnr") ?? "").trim().toUpperCase();
  if (pnr.length < 6) return { error: "Enter a valid PNR" };
  const b = await prisma.booking.findFirst({ where: { pnr } });
  if (!b) return { error: "No booking found for this PNR" };
  const d = b.details as Record<string, unknown>;
  const t = (b.travellers as { name: string; age: number; gender: string }[]) ?? [];
  return {
    result: {
      pnr, type: b.type, title: b.title, subtitle: b.subtitle ?? "", status: b.status, travelDate: b.travelDate.toISOString(),
      coach: (d.coach as string) ?? null,
      pax: t.map((p, i) => ({ name: p.name.replace(/(?<=^.).*(?=.$)/, (m) => "*".repeat(m.length)), age: p.age, status: b.status === "CANCELLED" ? "CAN" : b.type === "TRAIN" ? `CNF/${d.coach}/${10 + i * 3}` : b.seats[i] ? `CNF/${b.seats[i]}` : "CNF" })),
    },
  };
}
