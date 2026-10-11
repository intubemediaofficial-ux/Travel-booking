export type Svc = "FLIGHT" | "HOTEL" | "HOLIDAY" | "TRAIN" | "BUS" | "CAB";

export const SVC_LABEL: Record<Svc, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
  HOLIDAY: "Holiday",
  TRAIN: "Train",
  BUS: "Bus",
  CAB: "Cab",
};

export function taxRate(svc: Svc, nightly = 0) {
  if (svc === "HOTEL") return nightly > 7500 ? 0.18 : 0.12;
  return 0.05;
}

export function convenienceFee(svc: Svc, pax: number) {
  switch (svc) {
    case "FLIGHT":
      return 249 * pax;
    case "HOTEL":
      return 199;
    case "TRAIN":
      return 30 * pax;
    case "BUS":
      return 49;
    case "CAB":
      return 99;
    default:
      return 0;
  }
}

export type CouponLike = {
  code: string;
  kind: string;
  value: number;
  maxDiscount: number | null;
  minAmount: number;
  appliesTo: string;
  validTill: Date | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

export function couponDiscount(c: CouponLike | null | undefined, base: number, svc: Svc, now = new Date()) {
  if (!c) return { ok: false as const, discount: 0, error: "Invalid coupon code" };
  if (!c.active) return { ok: false as const, discount: 0, error: "This coupon is no longer active" };
  if (c.validTill && c.validTill < now) return { ok: false as const, discount: 0, error: "This coupon has expired" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return { ok: false as const, discount: 0, error: "Coupon usage limit reached" };
  if (c.appliesTo !== "ALL" && c.appliesTo !== svc)
    return { ok: false as const, discount: 0, error: `Valid only on ${SVC_LABEL[c.appliesTo as Svc] ?? c.appliesTo} bookings` };
  if (base < c.minAmount)
    return { ok: false as const, discount: 0, error: `Minimum booking amount ₹${c.minAmount.toLocaleString("en-IN")}` };
  let d = c.kind === "FLAT" ? c.value : Math.round((base * c.value) / 100);
  if (c.maxDiscount != null) d = Math.min(d, c.maxDiscount);
  d = Math.min(d, base);
  return { ok: true as const, discount: d, error: null };
}

export type Quote = {
  base: number;
  taxes: number;
  fee: number;
  discount: number;
  walletUsed: number;
  total: number;
};

export function quote(opts: {
  svc: Svc;
  base: number;
  pax: number;
  nightly?: number;
  discount?: number;
  wallet?: number;
}): Quote {
  const base = Math.round(opts.base);
  const taxes = Math.round(base * taxRate(opts.svc, opts.nightly ?? 0));
  const fee = convenienceFee(opts.svc, opts.pax);
  const discount = Math.min(opts.discount ?? 0, base);
  const gross = base + taxes + fee - discount;
  const walletUsed = Math.max(0, Math.min(opts.wallet ?? 0, gross));
  return { base, taxes, fee, discount, walletUsed, total: gross - walletUsed };
}

const TRAIN_CHARGE: Record<string, number> = { SL: 120, "3A": 180, "3E": 180, "2A": 200, "1A": 240, CC: 180, EC: 240 };

export function refundFor(
  b: {
    type: Svc;
    total: number;
    walletUsed: number;
    fee: number;
    taxes: number;
    baseAmount: number;
    travelDate: Date;
    travellers: unknown;
    details: unknown;
  },
  now = new Date(),
) {
  const paid = b.total + b.walletUsed;
  const hours = (b.travelDate.getTime() - now.getTime()) / 3600_000;
  const pax = Array.isArray(b.travellers) ? Math.max(1, b.travellers.length) : 1;
  const d = (b.details ?? {}) as Record<string, unknown>;
  if (hours <= 0) return { allowed: false, refund: 0, charge: paid, note: "Travel date has passed — cancellation not allowed" };
  const clamp = (r: number) => Math.max(0, Math.min(paid, Math.round(r)));
  let refund = 0;
  let note = "";
  switch (b.type) {
    case "FLIGHT": {
      if (hours < 3) {
        refund = b.taxes;
        note = "Less than 3 hrs to departure: only taxes refunded";
      } else if (d.refundable === false) {
        refund = b.taxes;
        note = "Non-refundable fare: only taxes refunded";
      } else {
        refund = paid - b.fee - Math.min(3000 * pax, b.baseAmount);
        note = `Airline cancellation charge ₹${Math.min(3000 * pax, b.baseAmount).toLocaleString("en-IN")} + convenience fee`;
      }
      break;
    }
    case "HOTEL": {
      if (d.freeCancel !== false && hours >= 24) {
        refund = paid - b.fee;
        note = "Free cancellation (24+ hrs before check-in)";
      } else {
        refund = (paid - b.fee) * 0.5;
        note = "50% charge as per hotel policy";
      }
      break;
    }
    case "HOLIDAY": {
      const days = hours / 24;
      const pct = days >= 30 ? 0.9 : days >= 15 ? 0.5 : days >= 7 ? 0.25 : 0;
      refund = paid * pct;
      note = `${Math.round(pct * 100)}% refund (${Math.floor(days)} days before travel)`;
      break;
    }
    case "TRAIN": {
      const cls = String(d.cls ?? "SL");
      if (hours >= 48) {
        refund = paid - b.fee - (TRAIN_CHARGE[cls] ?? 180) * pax;
        note = `Flat cancellation charge ₹${TRAIN_CHARGE[cls] ?? 180}/passenger`;
      } else if (hours >= 12) {
        refund = (paid - b.fee) * 0.75;
        note = "25% cancellation charge (12–48 hrs before departure)";
      } else if (hours >= 4) {
        refund = (paid - b.fee) * 0.5;
        note = "50% cancellation charge (4–12 hrs before departure)";
      } else {
        note = "No refund within 4 hrs of departure";
      }
      break;
    }
    case "BUS": {
      const pct = hours >= 24 ? 0.9 : hours >= 12 ? 0.75 : hours >= 6 ? 0.5 : 0;
      refund = (paid - b.fee) * pct;
      note = `${Math.round(pct * 100)}% refund as per operator policy`;
      break;
    }
    case "CAB": {
      if (hours >= 2) {
        refund = paid - b.fee;
        note = "Free cancellation (2+ hrs before pickup)";
      } else {
        refund = (paid - b.fee) * 0.5;
        note = "50% charge within 2 hrs of pickup";
      }
      break;
    }
  }
  const r = clamp(refund);
  return { allowed: true, refund: r, charge: paid - r, note };
}
