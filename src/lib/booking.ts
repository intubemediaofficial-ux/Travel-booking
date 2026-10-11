import "server-only";
import crypto from "crypto";
import type { BookingType, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { couponDiscount, quote, refundFor, type Svc } from "./pricing";
import { sendMail } from "./mail";
import { fmtDateTime, inr } from "./format";
import { HOLD_MINUTES } from "./inventory";
import { getSettings } from "./settings";

const PREFIX: Record<Svc, string> = { FLIGHT: "FL", HOTEL: "HT", HOLIDAY: "HL", TRAIN: "TR", BUS: "BS", CAB: "CB" };

export function genRef(type: Svc) {
  return `IT${PREFIX[type]}${crypto.randomInt(10_000_000, 99_999_999)}`;
}

function genPnr(type: Svc) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  if (type === "TRAIN") return String(crypto.randomInt(1_000_000_000, 9_999_999_999));
  return Array.from({ length: 6 }, () => A[crypto.randomInt(0, A.length)]).join("");
}

export type Traveller = { name: string; age: number; gender: string; berth?: string };

export type NewBooking = {
  userId: string;
  type: Svc;
  itemId: string;
  title: string;
  subtitle?: string;
  travelDate: Date;
  endDate?: Date;
  details: Prisma.InputJsonValue;
  travellers: Traveller[];
  seats?: string[];
  contact: { name: string; email: string; phone: string };
  base: number;
  pax: number;
  nightly?: number;
  couponCode?: string;
  useWallet?: boolean;
  lines: { itemId: string; date: string; endDate?: string; qty: number; seatNos?: string[] }[];
  /** Re-validates availability while inventory locks are held; must throw if no longer available. */
  recheck?: () => Promise<unknown>;
};

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const lockKey = (l: { itemId: string; date: string; endDate?: string }) => (l.endDate ? l.itemId : `${l.itemId}:${l.date}`);

export async function previewCoupon(code: string, svc: Svc, base: number) {
  const c = code ? await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } }) : null;
  return couponDiscount(c, base, svc);
}

export async function createBooking(b: NewBooking) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: b.userId } });
  let discount = 0;
  let couponCode: string | null = null;
  if (b.couponCode?.trim()) {
    const r = await previewCoupon(b.couponCode, b.type, b.base);
    if (!r.ok) throw new Error(r.error ?? "Invalid coupon");
    discount = r.discount;
    couponCode = b.couponCode.trim().toUpperCase();
  }
  const q = quote({ svc: b.type, base: b.base, pax: b.pax, nightly: b.nightly, discount, wallet: b.useWallet ? user.walletBalance : 0 });
  const keys = [...new Set(b.lines.map(lockKey))].sort();
  const booking = await prisma.$transaction(async (tx) => {
    for (const k of keys) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${k}))`;
    if (b.recheck) await b.recheck();
    return tx.booking.create({
    data: {
      ref: genRef(b.type),
      userId: b.userId,
      type: b.type as BookingType,
      itemId: b.itemId,
      title: b.title,
      subtitle: b.subtitle,
      travelDate: b.travelDate,
      endDate: b.endDate,
      details: b.details,
      travellers: b.travellers,
      seats: b.seats ?? [],
      contactName: b.contact.name,
      contactEmail: b.contact.email,
      contactPhone: b.contact.phone,
      baseAmount: q.base,
      taxes: q.taxes,
      fee: q.fee,
      discount: q.discount,
      couponCode,
      walletUsed: q.walletUsed,
      total: q.total,
      lines: { create: b.lines.map((l) => ({ ...l, seatNos: l.seatNos ?? [] })) },
    },
    });
  }, { timeout: 20_000, maxWait: 10_000 });
  if (q.total === 0) await confirmBooking(booking.ref, "Wallet", `WAL-${booking.ref}`);
  return booking;
}

export function holdExpired(b: { createdAt: Date }) {
  return Date.now() - b.createdAt.getTime() > HOLD_MINUTES * 60_000;
}

export async function confirmBooking(ref: string, method: string, paymentRef: string, opts: { ignoreHold?: boolean } = {}) {
  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({ where: { ref } });
    if (b.status !== "PENDING_PAYMENT") throw new Error("This booking is not awaiting payment");
    if (!opts.ignoreHold && holdExpired(b)) throw new Error("Payment session expired. Please search and book again.");
    const claimed = await tx.booking.updateMany({
      where: { ref, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", paymentStatus: "PAID", paymentMethod: method, paymentRef, paidAt: new Date(), pnr: genPnr(b.type as Svc) },
    });
    if (claimed.count !== 1) throw new Error("This booking is not awaiting payment");
    if (b.walletUsed > 0) {
      const debited = await tx.user.updateMany({ where: { id: b.userId, walletBalance: { gte: b.walletUsed } }, data: { walletBalance: { decrement: b.walletUsed } } });
      if (debited.count !== 1) throw new Error("Insufficient wallet balance");
      await tx.walletTxn.create({ data: { userId: b.userId, amount: -b.walletUsed, kind: "DEBIT", note: `Used for booking ${b.ref}`, bookingId: b.id } });
    }
    if (b.couponCode) {
      const c = await tx.coupon.findUnique({ where: { code: b.couponCode } });
      if (c) {
        const used = await tx.coupon.updateMany({
          where: { id: c.id, ...(c.usageLimit != null ? { usedCount: { lt: c.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (used.count !== 1 && !opts.ignoreHold) throw new Error("Coupon usage limit reached. Please book again without this coupon.");
      }
    }
    return tx.booking.findUniqueOrThrow({ where: { ref } });
  });
  const s = await getSettings();
  void sendMail(
    booking.contactEmail,
    `Booking confirmed — ${booking.title} (${booking.ref})`,
    `<div style="font-family:Arial,sans-serif"><h2 style="color:#0a6cf1">${esc(s.siteName)}: your booking is confirmed</h2>
     <p>Hi ${esc(booking.contactName)},</p><p><b>${esc(booking.title)}</b><br>${esc(booking.subtitle)}</p>
     <p>Booking ID: <b>${booking.ref}</b><br>PNR: <b>${booking.pnr}</b><br>Travel: ${fmtDateTime(booking.travelDate)}<br>Amount paid: <b>${inr(booking.total + booking.walletUsed)}</b></p>
     <p>Manage your trip any time from <i>My Trips</i>.</p><p>Happy travels!<br>${s.siteName}</p></div>`,
  );
  return booking;
}

export async function cancelBooking(
  ref: string,
  opts: { userId?: string; reason: string; refundTo: "WALLET" | "SOURCE"; overrideRefund?: number },
) {
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUniqueOrThrow({ where: { ref } });
    if (opts.userId && b.userId !== opts.userId) throw new Error("Not your booking");
    const now = new Date();
    if (b.status === "PENDING_PAYMENT") {
      const c = await tx.booking.updateMany({ where: { ref, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED", paymentStatus: "FAILED", cancelReason: opts.reason, cancelledAt: now } });
      if (c.count !== 1) throw new Error("Booking status changed, please refresh");
      return tx.booking.findUniqueOrThrow({ where: { ref } });
    }
    if (b.status !== "CONFIRMED") throw new Error("Only confirmed bookings can be cancelled");
    const r = refundFor({ ...b, type: b.type as Svc });
    if (!r.allowed && opts.overrideRefund == null) throw new Error(r.note);
    if (opts.overrideRefund != null && !Number.isFinite(opts.overrideRefund)) throw new Error("Enter a valid refund amount");
    const paid = b.total + b.walletUsed;
    const refund = Math.max(0, Math.min(paid, Math.round(opts.overrideRefund ?? r.refund)));
    const toWallet = opts.refundTo === "WALLET" ? refund : Math.min(refund, b.walletUsed);
    const c = await tx.booking.updateMany({
      where: { ref, status: "CONFIRMED" },
      data: {
        status: "CANCELLED",
        paymentStatus: refund === 0 ? "PAID" : refund >= paid ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundAmount: refund,
        refundTo: refund === 0 ? null : toWallet === refund ? "WALLET" : toWallet > 0 ? "SOURCE+WALLET" : "SOURCE",
        cancelReason: opts.reason,
        cancelledAt: now,
      },
    });
    if (c.count !== 1) throw new Error("Booking is already cancelled");
    if (toWallet > 0) {
      await tx.user.update({ where: { id: b.userId }, data: { walletBalance: { increment: toWallet } } });
      await tx.walletTxn.create({ data: { userId: b.userId, amount: toWallet, kind: "REFUND", note: `Refund for cancelled booking ${b.ref}`, bookingId: b.id } });
    }
    return tx.booking.findUniqueOrThrow({ where: { ref } });
  });
}

/** Marks unpaid bookings whose payment window lapsed long ago as cancelled (their inventory is already released). */
export async function expireStaleHolds(userId?: string) {
  await prisma.booking.updateMany({
    where: { status: "PENDING_PAYMENT", ...(userId ? { userId } : {}), createdAt: { lt: new Date(Date.now() - 4 * HOLD_MINUTES * 60_000) } },
    data: { status: "CANCELLED", paymentStatus: "FAILED", cancelReason: "Payment not completed in time", cancelledAt: new Date() },
  });
}

export async function completePastBookings(userId?: string) {
  const now = new Date();
  await prisma.booking.updateMany({
    where: { status: "CONFIRMED", ...(userId ? { userId } : {}), OR: [{ endDate: { lt: now } }, { endDate: null, travelDate: { lt: now } }] },
    data: { status: "COMPLETED" },
  });
}
