import { prisma } from "./db";
import { addTime, hash, km, nightsBetween, todayIST, weekday } from "./format";
import type { Prisma } from "@prisma/client";

export const HOLD_MINUTES = 15;

export function activeBookingWhere(): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: { in: ["CONFIRMED", "COMPLETED"] } },
      { status: "PENDING_PAYMENT", createdAt: { gte: new Date(Date.now() - HOLD_MINUTES * 60_000) } },
    ],
  };
}

export async function usedQty(itemIds: string[], date: string) {
  if (!itemIds.length) return new Map<string, number>();
  const rows = await prisma.bookingLine.groupBy({
    by: ["itemId"],
    where: { itemId: { in: itemIds }, date, booking: activeBookingWhere() },
    _sum: { qty: true },
  });
  return new Map(rows.map((r) => [r.itemId, r._sum.qty ?? 0]));
}

export async function usedRooms(roomIds: string[], checkIn: string, checkOut: string) {
  if (!roomIds.length) return new Map<string, number>();
  const rows = await prisma.bookingLine.groupBy({
    by: ["itemId"],
    where: { itemId: { in: roomIds }, date: { lt: checkOut }, endDate: { gt: checkIn }, booking: activeBookingWhere() },
    _sum: { qty: true },
  });
  return new Map(rows.map((r) => [r.itemId, r._sum.qty ?? 0]));
}

export async function takenSeats(busId: string, date: string) {
  const rows = await prisma.bookingLine.findMany({
    where: { itemId: busId, date, booking: activeBookingWhere() },
    select: { seatNos: true },
  });
  return rows.flatMap((r) => r.seatNos);
}

/** Demand-based fare multiplier: closer dates cost more, plus a stable per-item variation. */
export function fareFactor(id: string, date: string) {
  const days = nightsBetween(todayIST(), date);
  const urgency = days < 3 ? 1.3 : days < 7 ? 1.15 : days < 21 ? 1.05 : 1;
  return urgency * (0.92 + hash(id + date) * 0.16);
}

export const round10 = (n: number) => Math.round(n / 10) * 10;

export const CABIN = { E: "Economy", P: "Premium Economy", B: "Business" } as const;
export type Cabin = keyof typeof CABIN;

export function flightFare(f: { id: string; economyFare: number; premiumFare: number; businessFare: number }, date: string, cls: Cabin) {
  const base = cls === "B" ? f.businessFare : cls === "P" ? f.premiumFare : f.economyFare;
  return round10(base * fareFactor(f.id, date));
}

export function runsOn(days: string, date: string) {
  return days.includes(String(weekday(date)));
}

export async function searchFlights(from: string, to: string, date: string, cls: Cabin, pax: number) {
  const flights = await prisma.flight.findMany({
    where: { active: true, fromCity: { code: from }, toCity: { code: to } },
    include: { airline: true, fromCity: true, toCity: true },
  });
  const todays = flights.filter((f) => runsOn(f.days, date));
  const used = await usedQty(todays.map((f) => f.id), date);
  const now = todayIST();
  const nowTime = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(11, 16);
  return todays
    .filter((f) => date > now || f.departTime > nowTime)
    .map((f) => {
      const arr = addTime(f.departTime, f.durationMins);
      const seatsLeft = Math.max(0, f.seats - (used.get(f.id) ?? 0));
      return { ...f, arrTime: arr.time, arrDays: arr.days, fare: flightFare(f, date, cls), seatsLeft, available: seatsLeft >= pax };
    })
    .sort((a, b) => a.fare - b.fare);
}

export async function fareCalendar(from: string, to: string, date: string, cls: Cabin) {
  const flights = await prisma.flight.findMany({
    where: { active: true, fromCity: { code: from }, toCity: { code: to } },
    select: { id: true, days: true, economyFare: true, premiumFare: true, businessFare: true },
  });
  const out: { date: string; fare: number | null }[] = [];
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 3);
  const today = todayIST();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    if (ds < today) continue;
    const fares = flights.filter((f) => runsOn(f.days, ds)).map((f) => flightFare(f, ds, cls));
    out.push({ date: ds, fare: fares.length ? Math.min(...fares) : null });
  }
  return out;
}

export function hotelNightly(roomPrice: number, roomId: string, date: string) {
  return round10(roomPrice * (0.95 + hash(roomId + date.slice(0, 7)) * 0.1) * (weekday(date) >= 5 ? 1.08 : 1));
}

export function stayPrice(room: { id: string; price: number }, checkIn: string, checkOut: string) {
  const nights = Math.max(1, nightsBetween(checkIn, checkOut));
  let total = 0;
  const d = new Date(`${checkIn}T00:00:00Z`);
  for (let i = 0; i < nights; i++) {
    total += hotelNightly(room.price, room.id, d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return { nights, total, perNight: Math.round(total / nights) };
}

export function trainFare(base: number, trainId: string, date: string) {
  const days = nightsBetween(todayIST(), date);
  return Math.round(base * (days < 2 ? 1.3 : 1) * (0.98 + hash(trainId + date) * 0.04));
}

export type TrainClass = { code: string; name: string; fare: number; seats: number };

export async function searchTrains(from: string, to: string, date: string) {
  const trains = await prisma.train.findMany({
    where: { active: true, fromCity: { code: from }, toCity: { code: to } },
    include: { fromCity: true, toCity: true },
    orderBy: { departTime: "asc" },
  });
  const running = trains.filter((t) => runsOn(t.days, date));
  const keys = running.flatMap((t) => (t.classes as TrainClass[]).map((c) => `${t.id}:${c.code}`));
  const used = await usedQty(keys, date);
  return running.map((t) => {
    const arr = addTime(t.departTime, t.durationMins);
    return {
      ...t,
      arrTime: arr.time,
      arrDays: arr.days,
      cls: (t.classes as TrainClass[]).map((c) => ({
        ...c,
        fare: trainFare(c.fare, t.id, date),
        left: Math.max(0, c.seats - (used.get(`${t.id}:${c.code}`) ?? 0)),
      })),
    };
  });
}

export async function searchBuses(from: string, to: string, date: string) {
  const buses = await prisma.bus.findMany({
    where: { active: true, fromCity: { code: from }, toCity: { code: to } },
    include: { fromCity: true, toCity: true },
    orderBy: { departTime: "asc" },
  });
  const running = buses.filter((b) => runsOn(b.days, date));
  const used = await usedQty(running.map((b) => b.id), date);
  return running.map((b) => {
    const arr = addTime(b.departTime, b.durationMins);
    return { ...b, arrTime: arr.time, arrDays: arr.days, fare: busFare(b, date), seatsLeft: Math.max(0, b.seats - (used.get(b.id) ?? 0)) };
  });
}

export function busFare(b: { id: string; fare: number }, date: string) {
  return round10(b.fare * (weekday(date) >= 5 ? 1.1 : 1) * (0.95 + hash(b.id + date) * 0.1));
}

export function busLayout(sleeper: boolean, seats: number) {
  if (sleeper) {
    const half = Math.ceil(seats / 2);
    const deck = (p: string) => Array.from({ length: half }, (_, i) => `${p}${i + 1}`);
    return { sleeper, decks: [{ name: "Lower deck", seats: deck("L"), cols: 3 }, { name: "Upper deck", seats: deck("U"), cols: 3 }] };
  }
  return { sleeper, decks: [{ name: "Seats", seats: Array.from({ length: seats }, (_, i) => `S${i + 1}`), cols: 4 }] };
}

export type CabTrip = "ONEWAY" | "ROUND" | "AIRPORT";

export function cabDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number } | null, trip: CabTrip, days = 1) {
  if (trip === "AIRPORT" || !b) return 35;
  const d = Math.max(40, Math.round(km(a, b) * 1.3));
  return trip === "ROUND" ? Math.max(d * 2, 250 * Math.max(1, days)) : d;
}

export function cabFare(c: { perKm: number; baseFare: number }, distance: number, trip: CabTrip, days = 1) {
  const driver = trip === "ROUND" ? 300 * Math.max(1, days) : trip === "ONEWAY" && distance > 250 ? 300 : 0;
  return round10(c.baseFare + c.perKm * distance + driver);
}
