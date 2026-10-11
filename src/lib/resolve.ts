import "server-only";
import { prisma } from "./db";
import { addDays, addTime, duration, fmtDate, istDate, nightsBetween, todayIST } from "./format";
import {
  CABIN, type Cabin, busFare, busLayout, cabDistance, cabFare, flightFare, runsOn, stayPrice, takenSeats, trainFare,
  usedQty, usedRooms, type CabTrip, type TrainClass,
} from "./inventory";
import type { Svc } from "./pricing";

export type Resolved = {
  svc: Svc;
  itemId: string;
  title: string;
  subtitle: string;
  image?: string;
  travelDate: Date;
  endDate?: Date;
  base: number;
  pax: number;
  nightly?: number;
  details: Record<string, unknown>;
  lines: { itemId: string; date: string; endDate?: string; qty: number; seatNos?: string[] }[];
  seats?: string[];
  summary: [string, string][];
  travellers: number;
  mode: "full" | "lead";
  berth?: boolean;
};

type P = Record<string, string | undefined>;
const int = (v: string | undefined, d: number, min = 0, max = 99) => Math.min(max, Math.max(min, Number.isFinite(Number(v)) && v !== "" && v != null ? Math.floor(Number(v)) : d));
const isDate = (d?: string): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const validDate = (d?: string) => isDate(d) && d >= todayIST() && d <= addDays(todayIST(), 365);

export class BookErr extends Error {}

export async function resolveFlight(p: P): Promise<Resolved> {
  const cls = (["E", "P", "B"].includes(p.cls ?? "") ? p.cls : "E") as Cabin;
  const ad = int(p.ad, 1, 1, 9);
  const ch = int(p.ch, 0, 0, 4);
  const pax = ad + ch;
  if (!validDate(p.date)) throw new BookErr("Please choose a valid travel date");
  const legsIn = [{ id: p.f, date: p.date! }];
  if (p.r) {
    if (!validDate(p.rdate) || p.rdate! < p.date!) throw new BookErr("Invalid return date");
    legsIn.push({ id: p.r, date: p.rdate! });
  }
  const legs = [];
  let base = 0;
  for (const l of legsIn) {
    const f = await prisma.flight.findFirst({ where: { id: l.id ?? "", active: true }, include: { airline: true, fromCity: true, toCity: true } });
    if (!f || !runsOn(f.days, l.date)) throw new BookErr("Selected flight is not available on this date");
    const used = (await usedQty([f.id], l.date)).get(f.id) ?? 0;
    if (f.seats - used < pax) throw new BookErr(`Only ${f.seats - used} seats left on ${f.flightNo}`);
    const fare = flightFare(f, l.date, cls);
    const adultFare = fare;
    const childFare = Math.round(fare * 0.75);
    base += adultFare * ad + childFare * ch;
    const arr = addTime(f.departTime, f.durationMins);
    legs.push({
      flightId: f.id, flightNo: f.flightNo, airline: f.airline.name, airlineCode: f.airline.code, color: f.airline.color, date: l.date,
      from: f.fromCity.code, fromName: f.fromCity.name, fromAirport: f.fromCity.airport, to: f.toCity.code, toName: f.toCity.name, toAirport: f.toCity.airport,
      dep: f.departTime, arr: arr.time, arrDays: arr.days, duration: f.durationMins, stops: f.stops, stopCity: f.stopCity, baggage: f.baggage, refundable: f.refundable, meal: f.meal, adultFare, childFare,
    });
  }
  const o = legs[0];
  return {
    svc: "FLIGHT", itemId: o.flightId, pax, base, travellers: pax, mode: "full",
    title: `${o.fromName} → ${o.toName}${legs[1] ? " (Round trip)" : ""}`,
    subtitle: legs.map((l) => `${l.airline} ${l.flightNo} · ${fmtDate(l.date)} · ${l.dep}–${l.arr}`).join(" | "),
    travelDate: istDate(o.date, o.dep),
    endDate: legs[1] ? istDate(legs[1].date, legs[1].dep) : undefined,
    details: { legs, cls, cabin: CABIN[cls], ad, ch, refundable: legs.every((l) => l.refundable) },
    lines: legs.map((l) => ({ itemId: l.flightId, date: l.date, qty: pax })),
    summary: [
      ...legs.map((l, i): [string, string] => [i ? "Return" : "Onward", `${l.airline} ${l.flightNo}, ${fmtDate(l.date)} ${l.dep} → ${l.arr}${l.arrDays ? " +1" : ""} (${duration(l.duration)}, ${l.stops ? `${l.stops} stop` : "non-stop"})`]),
      ["Cabin", CABIN[cls]],
      ["Travellers", `${ad} Adult${ad > 1 ? "s" : ""}${ch ? `, ${ch} Child` : ""}`],
      ["Baggage", o.baggage],
      ["Fare type", legs.every((l) => l.refundable) ? "Refundable (cancellation charges apply)" : "Non-refundable"],
    ],
  };
}

export async function resolveHotel(p: P): Promise<Resolved> {
  const room = await prisma.room.findFirst({ where: { id: p.room ?? "", hotel: { active: true } }, include: { hotel: { include: { city: true } } } });
  if (!room) throw new BookErr("Room not found");
  if (!validDate(p.in) || !isDate(p.out) || p.out <= p.in!) throw new BookErr("Please choose valid check-in and check-out dates");
  const nights = nightsBetween(p.in!, p.out);
  if (nights > 30) throw new BookErr("Maximum stay is 30 nights");
  const rooms = int(p.rooms, 1, 1, 5);
  const guests = int(p.guests, 2, 1, 20);
  if (guests > rooms * room.maxGuests) throw new BookErr(`${room.name} allows max ${room.maxGuests} guests per room — add more rooms`);
  const used = (await usedRooms([room.id], p.in!, p.out)).get(room.id) ?? 0;
  if (room.inventory - used < rooms) throw new BookErr(`Only ${Math.max(0, room.inventory - used)} rooms left for these dates`);
  const sp = stayPrice(room, p.in!, p.out);
  const h = room.hotel;
  return {
    svc: "HOTEL", itemId: room.id, pax: guests, base: sp.total * rooms, nightly: sp.perNight, travellers: 1, mode: "lead",
    title: h.name, subtitle: `${room.name} · ${h.city.name} · ${nights} night${nights > 1 ? "s" : ""}`, image: room.image ?? h.images[0],
    travelDate: istDate(p.in!, h.checkIn), endDate: istDate(p.out, h.checkOut),
    details: { hotelId: h.id, hotelSlug: h.slug, hotel: h.name, address: h.address, room: room.name, rooms, guests, nights, checkIn: p.in, checkOut: p.out, checkInTime: h.checkIn, checkOutTime: h.checkOut, perNight: sp.perNight, breakfast: room.breakfast, freeCancel: room.freeCancel },
    lines: [{ itemId: room.id, date: p.in!, endDate: p.out, qty: rooms }],
    summary: [
      ["Hotel", `${h.name}, ${h.locality ?? h.city.name}`],
      ["Room", `${room.name} × ${rooms}`],
      ["Check-in", `${fmtDate(p.in!, { weekday: "short" })} from ${h.checkIn}`],
      ["Check-out", `${fmtDate(p.out, { weekday: "short" })} by ${h.checkOut}`],
      ["Guests", `${guests} guest${guests > 1 ? "s" : ""}`],
      ["Meals", room.breakfast ? "Breakfast included" : "Room only"],
      ["Cancellation", room.freeCancel ? "Free cancellation till 24 hrs before check-in" : "50% charge on cancellation"],
    ],
  };
}

export async function resolveHoliday(p: P): Promise<Resolved> {
  const pkg = await prisma.package.findFirst({ where: { id: p.pkg ?? "", active: true }, include: { city: true } });
  if (!pkg) throw new BookErr("Package not found");
  if (!validDate(p.date) || p.date! < addDays(todayIST(), 3)) throw new BookErr("Travel date must be at least 3 days from today");
  const ad = int(p.ad, 2, 1, 12);
  const ch = int(p.ch, 0, 0, 8);
  const base = pkg.price * ad + Math.round(pkg.price * 0.5) * ch;
  return {
    svc: "HOLIDAY", itemId: pkg.id, pax: ad + ch, base, travellers: ad + ch, mode: "full",
    title: pkg.title, subtitle: `${pkg.nights}N/${pkg.nights + 1}D · ${pkg.city.name} · from ${fmtDate(p.date!)}`, image: pkg.images[0],
    travelDate: istDate(p.date!, "10:00"), endDate: istDate(addDays(p.date!, pkg.nights), "12:00"),
    details: { slug: pkg.slug, nights: pkg.nights, destination: pkg.city.name, ad, ch, inclusions: pkg.inclusions },
    lines: [{ itemId: pkg.id, date: p.date!, qty: ad + ch }],
    summary: [
      ["Package", `${pkg.title} (${pkg.nights}N/${pkg.nights + 1}D)`],
      ["Start date", fmtDate(p.date!, { weekday: "short" })],
      ["End date", fmtDate(addDays(p.date!, pkg.nights), { weekday: "short" })],
      ["Travellers", `${ad} Adult${ad > 1 ? "s" : ""}${ch ? `, ${ch} Child (50% price)` : ""}`],
      ["Price", `₹${pkg.price.toLocaleString("en-IN")} per adult`],
    ],
  };
}

export async function resolveTrain(p: P): Promise<Resolved> {
  const t = await prisma.train.findFirst({ where: { id: p.t ?? "", active: true }, include: { fromCity: true, toCity: true } });
  if (!t) throw new BookErr("Train not found");
  if (!validDate(p.date) || !runsOn(t.days, p.date!)) throw new BookErr("Train does not run on this date");
  const c = (t.classes as TrainClass[]).find((x) => x.code === p.cls);
  if (!c) throw new BookErr("Choose a class");
  const pax = int(p.pax, 1, 1, 6);
  const key = `${t.id}:${c.code}`;
  const left = c.seats - ((await usedQty([key], p.date!)).get(key) ?? 0);
  if (left < pax) throw new BookErr(`Only ${Math.max(0, left)} berths available in ${c.code}`);
  const fare = trainFare(c.fare, t.id, p.date!);
  const arr = addTime(t.departTime, t.durationMins);
  return {
    svc: "TRAIN", itemId: t.id, pax, base: fare * pax, travellers: pax, mode: "full", berth: true,
    title: `${t.number} ${t.name}`, subtitle: `${t.fromCity.station} → ${t.toCity.station} · ${c.name} · ${fmtDate(p.date!)}`,
    travelDate: istDate(p.date!, t.departTime),
    details: { number: t.number, name: t.name, from: t.fromCity.station, to: t.toCity.station, dep: t.departTime, arr: arr.time, arrDays: arr.days, duration: t.durationMins, cls: c.code, className: c.name, fare, coach: `${c.code === "SL" ? "S" : c.code === "3A" ? "B" : c.code === "2A" ? "A" : c.code === "1A" ? "H" : c.code === "CC" ? "C" : "E"}${1 + (Number(t.number) % 6)}` },
    lines: [{ itemId: key, date: p.date!, qty: pax }],
    summary: [
      ["Train", `${t.number} ${t.name}`],
      ["From", `${t.fromCity.station} · ${fmtDate(p.date!)} ${t.departTime}`],
      ["To", `${t.toCity.station} · ${arr.time}${arr.days ? ` (+${arr.days} day)` : ""}`],
      ["Class", `${c.name} (${c.code})`],
      ["Fare", `₹${fare.toLocaleString("en-IN")} per passenger`],
    ],
  };
}

export async function resolveBus(p: P): Promise<Resolved> {
  const b = await prisma.bus.findFirst({ where: { id: p.bus ?? "", active: true }, include: { fromCity: true, toCity: true } });
  if (!b) throw new BookErr("Bus not found");
  if (!validDate(p.date) || !runsOn(b.days, p.date!)) throw new BookErr("Bus does not run on this date");
  const seats = (p.seats ?? "").split(",").filter(Boolean);
  const valid = new Set(busLayout(b.sleeper, b.seats).decks.flatMap((d) => d.seats));
  if (!seats.length || seats.length > 6 || seats.some((s) => !valid.has(s))) throw new BookErr("Please select 1–6 valid seats");
  const taken = new Set(await takenSeats(b.id, p.date!));
  const clash = seats.filter((s) => taken.has(s));
  if (clash.length) throw new BookErr(`Seat ${clash.join(", ")} just got booked. Please choose another seat.`);
  const fare = busFare(b, p.date!);
  const bp = b.boarding.includes(p.bp ?? "") ? p.bp! : b.boarding[0];
  const dp = b.dropping.includes(p.dp ?? "") ? p.dp! : b.dropping[0];
  const arr = addTime(b.departTime, b.durationMins);
  return {
    svc: "BUS", itemId: b.id, pax: seats.length, base: fare * seats.length, travellers: seats.length, mode: "full", seats,
    title: `${b.fromCity.name} → ${b.toCity.name}`, subtitle: `${b.operator} · ${b.busType} · ${fmtDate(p.date!)} ${b.departTime}`,
    travelDate: istDate(p.date!, b.departTime),
    details: { operator: b.operator, busType: b.busType, dep: b.departTime, arr: arr.time, arrDays: arr.days, duration: b.durationMins, boarding: bp, dropping: dp, fare },
    lines: [{ itemId: b.id, date: p.date!, qty: seats.length, seatNos: seats }],
    summary: [
      ["Operator", `${b.operator} (${b.busType})`],
      ["Boarding", `${bp} · ${fmtDate(p.date!)} ${b.departTime}`],
      ["Dropping", `${dp} · ${arr.time}${arr.days ? " (+1 day)" : ""}`],
      ["Seats", seats.join(", ")],
      ["Fare", `₹${fare.toLocaleString("en-IN")} per seat`],
    ],
  };
}

export async function resolveCab(p: P): Promise<Resolved> {
  const cab = await prisma.cabType.findFirst({ where: { id: p.cab ?? "", active: true } });
  if (!cab) throw new BookErr("Cab not found");
  const trip = (["ONEWAY", "ROUND", "AIRPORT"].includes(p.trip ?? "") ? p.trip : "ONEWAY") as CabTrip;
  const from = await prisma.city.findUnique({ where: { code: p.from ?? "" } });
  const to = trip === "AIRPORT" ? null : await prisma.city.findUnique({ where: { code: p.to ?? "" } });
  if (!from || (trip !== "AIRPORT" && (!to || to.id === from.id))) throw new BookErr("Choose valid pickup and drop cities");
  if (!validDate(p.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time ?? "")) throw new BookErr("Choose a valid pickup date and time");
  const pickupAt = istDate(p.date!, p.time!);
  if (pickupAt.getTime() < Date.now() + 2 * 3600_000) throw new BookErr("Pickup must be at least 2 hours from now");
  const ret = trip === "ROUND" ? (isDate(p.ret) && p.ret >= p.date! ? p.ret : p.date!) : undefined;
  if (ret && nightsBetween(p.date!, ret) > 30) throw new BookErr("Round trips can be at most 30 days");
  const days = ret ? nightsBetween(p.date!, ret) + 1 : 1;
  const dist = cabDistance(from, to, trip, days);
  const fare = cabFare(cab, dist, trip, days);
  const route = trip === "AIRPORT" ? `${from.name} airport transfer` : `${from.name} → ${to!.name}${trip === "ROUND" ? ` → ${from.name}` : ""}`;
  return {
    svc: "CAB", itemId: cab.id, pax: 1, base: fare, travellers: 1, mode: "lead",
    title: `${cab.name} · ${route}`, subtitle: `${cab.models} · ${fmtDate(p.date!)} ${p.time} · ${dist} km`, image: cab.image ?? undefined,
    travelDate: pickupAt, endDate: ret ? istDate(ret, "23:00") : undefined,
    details: { trip, cab: cab.name, models: cab.models, seats: cab.seats, from: from.name, to: to?.name ?? null, km: dist, days, perKm: cab.perKm, ret: ret ?? null },
    lines: [],
    summary: [
      ["Car", `${cab.name} (${cab.models}), ${cab.seats} seats, ${cab.bags} bags`],
      ["Trip", trip === "ONEWAY" ? "Outstation one-way" : trip === "ROUND" ? `Round trip · ${days} day${days > 1 ? "s" : ""}` : "Airport transfer"],
      ["Route", route],
      ["Pickup", `${fmtDate(p.date!, { weekday: "short" })} at ${p.time}`],
      ["Estimated distance", `${dist} km (₹${cab.perKm}/km beyond)`],
      ["Includes", "Driver allowance, fuel, GST on fare. Tolls & parking extra."],
    ],
  };
}

export const RESOLVERS: Record<Svc, (p: P) => Promise<Resolved>> = {
  FLIGHT: resolveFlight, HOTEL: resolveHotel, HOLIDAY: resolveHoliday, TRAIN: resolveTrain, BUS: resolveBus, CAB: resolveCab,
};
