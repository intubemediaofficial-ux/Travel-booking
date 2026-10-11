"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, Hotel, Palmtree, TrainFront, Bus, CarTaxiFront, ArrowLeftRight, Search } from "lucide-react";
import type { CityOpt } from "@/lib/cities";
import { CityInput } from "./CityInput";

export type Tab = "flights" | "hotels" | "holidays" | "trains" | "buses" | "cabs";

const TABS: { id: Tab; label: string; icon: typeof Plane }[] = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "holidays", label: "Holidays", icon: Palmtree },
  { id: "trains", label: "Trains", icon: TrainFront },
  { id: "buses", label: "Buses", icon: Bus },
  { id: "cabs", label: "Cabs", icon: CarTaxiFront },
];

const iso = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
const plus = (n: number) => iso(new Date(Date.now() + n * 86400_000));

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-lg border border-sand-200 bg-sand-50 px-4 py-2.5 transition hover:border-brand-400 focus-within:border-brand-700 focus-within:bg-white">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700/70">{label}</span>
      {children}
    </label>
  );
}

const field = "w-full min-w-0 bg-transparent text-[15px] font-semibold text-brand-950 outline-none [color-scheme:light] md:text-base";

export function SearchWidget({
  cities,
  initial = "flights",
  params = {},
  compact = false,
  tabs = true,
}: {
  cities: CityOpt[];
  initial?: Tab;
  params?: Record<string, string | undefined>;
  compact?: boolean;
  tabs?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initial);
  const p = (k: string, d: string) => params[k] ?? d;
  const air = cities;
  const rail = cities.filter((c) => c.station);
  const domestic = cities.filter((c) => c.country === "India");

  const [from, setFrom] = useState(p("from", "DEL"));
  const [to, setTo] = useState(p("to", initial === "trains" || initial === "buses" ? "JAI" : "BOM"));
  const [date, setDate] = useState(p("date", plus(7)));
  const [ret, setRet] = useState(p("ret", ""));
  const [round, setRound] = useState(!!params.ret);
  const [ad, setAd] = useState(p("ad", "1"));
  const [ch, setCh] = useState(p("ch", "0"));
  const [cls, setCls] = useState(p("cls", "E"));
  const [city, setCity] = useState(p("city", "GOI"));
  const [cin, setCin] = useState(p("in", plus(7)));
  const [cout, setCout] = useState(p("out", plus(9)));
  const [rooms, setRooms] = useState(p("rooms", "1"));
  const [guests, setGuests] = useState(p("guests", "2"));
  const [dest, setDest] = useState(p("dest", ""));
  const [cat, setCat] = useState(p("cat", ""));
  const [trip, setTrip] = useState(p("trip", "ONEWAY"));
  const [time, setTime] = useState(p("time", "09:00"));

  const today = plus(0);
  const go = (path: string, q: Record<string, string>) => {
    const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== "" && v != null));
    router.push(`${path}?${s.toString()}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "flights") go("/flights", { from, to, date, ret: round ? ret || date : "", ad, ch, cls });
    if (tab === "hotels") go("/hotels", { city, in: cin, out: cout > cin ? cout : plus(1 + Math.round((Date.parse(cin) - Date.now()) / 86400_000)), rooms, guests });
    if (tab === "holidays") go("/holidays", { dest, cat });
    if (tab === "trains") go("/trains", { from, to, date });
    if (tab === "buses") go("/buses", { from, to, date });
    if (tab === "cabs") go("/cabs", { trip, from, to: trip === "AIRPORT" ? "" : to, date, time, ret: trip === "ROUND" ? ret || date : "" });
  };

  const swap = (
    <button
      type="button"
      aria-label="Swap"
      onClick={() => {
        setFrom(to);
        setTo(from);
      }}
      className="absolute left-1/2 top-1/2 z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 place-items-center rounded-md bg-accent-500 text-brand-950 shadow-md hover:bg-accent-400"
    >
      <ArrowLeftRight className="h-4 w-4 -rotate-45" />
    </button>
  );

  return (
    <div className={`relative ${tabs ? "overflow-hidden rounded-2xl bg-white shadow-2xl shadow-brand-950/30 md:grid md:grid-cols-[170px_1fr]" : ""}`}>
      {tabs && (
        <div className="flex gap-1 overflow-x-auto bg-brand-900 p-2 md:flex-col md:gap-0.5 md:p-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition md:w-full ${tab === id ? "bg-accent-500 text-brand-950" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className={`relative bg-white p-4 sm:p-5 ${tabs ? "md:p-7" : "rounded-xl bg-white shadow-xl shadow-black/20"}`}>
        {tabs && <p className="eyebrow mb-3">Search {TABS.find((t) => t.id === tab)?.label.toLowerCase()}</p>}
        {tab === "flights" && (
          <>
            <div className="mb-3 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1 text-sm font-medium">
              {[["One way", false], ["Round trip", true]].map(([l, v]) => (
                <label key={String(l)} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 has-checked:bg-white has-checked:text-brand-800 has-checked:shadow-sm">
                  <input type="radio" checked={round === v} onChange={() => setRound(v as boolean)} className="accent-brand-700" /> {l as string}
                </label>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1.2fr]">
              <div className="relative grid grid-cols-2 gap-2">
                <CityInput label="From" name="from" value={from} onChange={setFrom} cities={air} mode="air" />
                {swap}
                <CityInput label="To" name="to" value={to} onChange={setTo} cities={air} mode="air" />
              </div>
              <Box label="Departure"><input type="date" className={field} value={date} min={today} onChange={(e) => setDate(e.target.value)} required /></Box>
              <Box label="Return">
                {round ? (
                  <input type="date" className={field} value={ret || date} min={date} onChange={(e) => setRet(e.target.value)} />
                ) : (
                  <button type="button" onClick={() => setRound(true)} className="text-left text-sm font-semibold text-slate-400">Tap to add a return date for bigger discounts</button>
                )}
              </Box>
              <Box label="Travellers & class">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <select aria-label="Adults" value={ad} onChange={(e) => setAd(e.target.value)} className="bg-transparent outline-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n} Adult{n > 1 ? "s" : ""}</option>)}
                  </select>
                  <select aria-label="Children" value={ch} onChange={(e) => setCh(e.target.value)} className="bg-transparent outline-none">
                    {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} Child</option>)}
                  </select>
                </div>
                <select aria-label="Cabin class" value={cls} onChange={(e) => setCls(e.target.value)} className="mt-1 bg-transparent text-xs font-semibold text-slate-500 outline-none">
                  <option value="E">Economy</option>
                  <option value="P">Premium Economy</option>
                  <option value="B">Business</option>
                </select>
              </Box>
            </div>
          </>
        )}
        {tab === "hotels" && (
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <CityInput label="City, property or location" name="city" value={city} onChange={setCity} cities={cities} />
            <Box label="Check-in"><input type="date" className={field} value={cin} min={today} onChange={(e) => setCin(e.target.value)} required /></Box>
            <Box label="Check-out"><input type="date" className={field} value={cout} min={cin} onChange={(e) => setCout(e.target.value)} required /></Box>
            <Box label="Rooms & guests">
              <div className="flex gap-2 text-sm font-bold">
                <select aria-label="Rooms" value={rooms} onChange={(e) => setRooms(e.target.value)} className="bg-transparent outline-none">
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} Room{n > 1 ? "s" : ""}</option>)}
                </select>
                <select aria-label="Guests" value={guests} onChange={(e) => setGuests(e.target.value)} className="bg-transparent outline-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>)}
                </select>
              </div>
            </Box>
          </div>
        )}
        {tab === "holidays" && (
          <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
            <Box label="Destination">
              <select aria-label="Destination" value={dest} onChange={(e) => setDest(e.target.value)} className={field}>
                <option value="">All destinations</option>
                {cities.map((c) => <option key={c.code} value={c.code}>{c.name}{c.country !== "India" ? `, ${c.country}` : ""}</option>)}
              </select>
            </Box>
            <Box label="Theme">
              <select aria-label="Theme" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
                <option value="">Any theme</option>
                {["Honeymoon", "Family", "Adventure", "Beach", "Heritage", "Pilgrimage", "International"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Box>
          </div>
        )}
        {(tab === "trains" || tab === "buses") && (
          <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
            <div className="relative grid grid-cols-2 gap-2">
              <CityInput label="From" name="from" value={from} onChange={setFrom} cities={tab === "trains" ? rail : domestic} mode={tab === "trains" ? "rail" : "city"} />
              {swap}
              <CityInput label="To" name="to" value={to} onChange={setTo} cities={tab === "trains" ? rail : domestic} mode={tab === "trains" ? "rail" : "city"} />
            </div>
            <Box label="Travel date"><input type="date" className={field} value={date} min={today} onChange={(e) => setDate(e.target.value)} required /></Box>
          </div>
        )}
        {tab === "cabs" && (
          <>
            <div className="mb-3 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1 text-sm font-medium">
              {[["ONEWAY", "Outstation one-way"], ["ROUND", "Outstation round trip"], ["AIRPORT", "Airport transfer"]].map(([v, l]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 has-checked:bg-white has-checked:text-brand-800 has-checked:shadow-sm">
                  <input type="radio" checked={trip === v} onChange={() => setTrip(v)} className="accent-brand-700" /> {l}
                </label>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
              {trip === "AIRPORT" ? (
                <CityInput label="City (airport pickup/drop)" name="from" value={from} onChange={setFrom} cities={domestic} />
              ) : (
                <div className="relative grid grid-cols-2 gap-2">
                  <CityInput label="From" name="from" value={from} onChange={setFrom} cities={domestic} />
                  {swap}
                  <CityInput label="To" name="to" value={to} onChange={setTo} cities={domestic} />
                </div>
              )}
              <Box label="Pickup date"><input type="date" className={field} value={date} min={today} onChange={(e) => setDate(e.target.value)} required /></Box>
              <Box label="Pickup time"><input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} required /></Box>
              <Box label="Return">
                {trip === "ROUND" ? (
                  <input type="date" className={field} value={ret || date} min={date} onChange={(e) => setRet(e.target.value)} />
                ) : (
                  <span className="text-sm font-semibold text-slate-400">—</span>
                )}
              </Box>
            </div>
          </>
        )}
        <div className={`flex items-center justify-between gap-3 ${compact ? "mt-3" : "mt-5 border-t border-dashed border-sand-200 pt-4"}`}>
          <p className={`text-xs text-slate-500 ${compact ? "hidden" : "hidden sm:block"}`}>Live fares · Free cancellation options · Instant e-ticket</p>
          <button className={`btn-accent w-full sm:ml-auto sm:w-auto ${compact ? "px-8" : "px-10 py-3 text-base"}`} data-testid="search-btn">
            <Search className="h-5 w-5" /> Search
          </button>
        </div>
      </form>
    </div>
  );
}
