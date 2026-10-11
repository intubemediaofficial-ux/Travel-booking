import { describe, expect, it } from "vitest";
import { couponDiscount, convenienceFee, quote, refundFor, taxRate } from "@/lib/pricing";

const coupon = { code: "X", kind: "PERCENT", value: 10, maxDiscount: 500, minAmount: 1000, appliesTo: "ALL", validTill: null, usageLimit: null, usedCount: 0, active: true };
const H = 3600_000;
const booking = (type: "FLIGHT" | "HOTEL" | "HOLIDAY" | "TRAIN" | "BUS" | "CAB", hours: number, extra: Partial<{ details: unknown; travellers: unknown }> = {}) => ({
  type, total: 10000, walletUsed: 0, fee: 200, taxes: 500, baseAmount: 9300, travelDate: new Date(Date.now() + hours * H), travellers: [{}], details: {}, ...extra,
});

describe("taxes and fees", () => {
  it("uses hotel GST slabs", () => {
    expect(taxRate("HOTEL", 5000)).toBe(0.12);
    expect(taxRate("HOTEL", 9000)).toBe(0.18);
    expect(taxRate("FLIGHT")).toBe(0.05);
  });
  it("charges per-passenger fee for flights and trains", () => {
    expect(convenienceFee("FLIGHT", 2)).toBe(498);
    expect(convenienceFee("TRAIN", 3)).toBe(90);
    expect(convenienceFee("HOLIDAY", 4)).toBe(0);
  });
});

describe("coupons", () => {
  it("applies percent with cap", () => {
    expect(couponDiscount(coupon, 3000, "FLIGHT")).toMatchObject({ ok: true, discount: 300 });
    expect(couponDiscount(coupon, 20000, "FLIGHT")).toMatchObject({ ok: true, discount: 500 });
  });
  it("applies flat discounts", () => {
    expect(couponDiscount({ ...coupon, kind: "FLAT", value: 750, maxDiscount: null }, 5000, "HOTEL").discount).toBe(750);
  });
  it("rejects invalid coupons", () => {
    expect(couponDiscount(null, 5000, "FLIGHT").ok).toBe(false);
    expect(couponDiscount({ ...coupon, active: false }, 5000, "FLIGHT").error).toMatch(/no longer active/);
    expect(couponDiscount({ ...coupon, validTill: new Date(Date.now() - 1000) }, 5000, "FLIGHT").error).toMatch(/expired/);
    expect(couponDiscount({ ...coupon, usageLimit: 5, usedCount: 5 }, 5000, "FLIGHT").error).toMatch(/limit/);
    expect(couponDiscount({ ...coupon, appliesTo: "HOTEL" }, 5000, "FLIGHT").error).toMatch(/Valid only/);
    expect(couponDiscount(coupon, 500, "FLIGHT").error).toMatch(/Minimum/);
  });
});

describe("quote", () => {
  it("adds taxes and fees and subtracts discount and wallet", () => {
    const q = quote({ svc: "FLIGHT", base: 5000, pax: 1, discount: 300, wallet: 1000 });
    expect(q).toEqual({ base: 5000, taxes: 250, fee: 249, discount: 300, walletUsed: 1000, total: 4199 });
  });
  it("never lets wallet exceed the payable amount", () => {
    const q = quote({ svc: "BUS", base: 800, pax: 1, wallet: 99999 });
    expect(q.total).toBe(0);
    expect(q.walletUsed).toBe(800 + 40 + 49);
  });
  it("caps discount at base fare", () => {
    expect(quote({ svc: "CAB", base: 100, pax: 1, discount: 500 }).discount).toBe(100);
  });
});

describe("refunds", () => {
  it("blocks cancellation after travel", () => {
    expect(refundFor(booking("FLIGHT", -1)).allowed).toBe(false);
  });
  it("flight: airline charge, non-refundable and last-minute", () => {
    expect(refundFor(booking("FLIGHT", 48)).refund).toBe(10000 - 200 - 3000);
    expect(refundFor(booking("FLIGHT", 48, { details: { refundable: false } })).refund).toBe(500);
    expect(refundFor(booking("FLIGHT", 2)).refund).toBe(500);
  });
  it("hotel: free cancellation vs 50%", () => {
    expect(refundFor(booking("HOTEL", 48)).refund).toBe(9800);
    expect(refundFor(booking("HOTEL", 10)).refund).toBe(4900);
    expect(refundFor(booking("HOTEL", 48, { details: { freeCancel: false } })).refund).toBe(4900);
  });
  it("holiday slabs", () => {
    expect(refundFor(booking("HOLIDAY", 24 * 40)).refund).toBe(9000);
    expect(refundFor(booking("HOLIDAY", 24 * 20)).refund).toBe(5000);
    expect(refundFor(booking("HOLIDAY", 24 * 3)).refund).toBe(0);
  });
  it("train slabs", () => {
    expect(refundFor(booking("TRAIN", 72, { details: { cls: "3A" } })).refund).toBe(10000 - 200 - 180);
    expect(refundFor(booking("TRAIN", 24)).refund).toBe(7350);
    expect(refundFor(booking("TRAIN", 2)).refund).toBe(0);
  });
  it("bus and cab slabs", () => {
    expect(refundFor(booking("BUS", 30)).refund).toBe(8820);
    expect(refundFor(booking("BUS", 3)).refund).toBe(0);
    expect(refundFor(booking("CAB", 5)).refund).toBe(9800);
    expect(refundFor(booking("CAB", 1)).refund).toBe(4900);
  });
  it("includes wallet-paid amount in refund", () => {
    expect(refundFor({ ...booking("HOTEL", 48), total: 0, walletUsed: 10000 }).refund).toBe(9800);
  });
});
