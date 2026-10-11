import { describe, expect, it } from "vitest";
import { addTime, duration, inr, km, slugify, timeSlot, hash } from "@/lib/format";

describe("format helpers", () => {
  it("formats rupees in Indian grouping", () => expect(inr(1234567)).toBe("₹12,34,567"));
  it("formats durations", () => { expect(duration(135)).toBe("2h 15m"); expect(duration(45)).toBe("45m"); });
  it("adds time across midnight", () => expect(addTime("22:30", 150)).toEqual({ time: "01:00", days: 1 }));
  it("buckets time slots", () => { expect(timeSlot("05:00")).toBe("early"); expect(timeSlot("09:00")).toBe("morning"); expect(timeSlot("13:00")).toBe("afternoon"); expect(timeSlot("20:00")).toBe("night"); });
  it("slugifies", () => expect(slugify("  Taj Hotel & Spa, Goa! ")).toBe("taj-hotel-spa-goa"));
  it("hash is deterministic and in [0,1]", () => { expect(hash("a")).toBe(hash("a")); expect(hash("abc")).toBeGreaterThanOrEqual(0); expect(hash("abc")).toBeLessThanOrEqual(1); });
  it("computes distance Delhi–Mumbai ≈ 1150 km", () => { const d = km({ lat: 28.61, lng: 77.21 }, { lat: 19.08, lng: 72.88 }); expect(d).toBeGreaterThan(1100); expect(d).toBeLessThan(1200); });
});
