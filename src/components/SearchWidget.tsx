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
    <label className="block rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-brand-400">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const field = "w-full bg-transparent text-lg font-extrabold text-slate-900 outline-none";

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
      className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-600 shadow ring-1 ring-slate-200 hover:bg-brand-50"
    >
      <ArrowLeftRight className="h-4 w-4" />
    </button>
  );

  return (
    <div className={`relative ${compact ? "" : "pb-8"}`}>
      {tabs && (
        <div className="relative z-10 mx-auto -mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex min-w-[76px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${tab === id ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-brand-600"}`}
            >
              <Icon className={`h-6 w-6 ${tab === id ? "text-brand-600" : ""}`} />
              {label}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className={`card relative px-5 ${tabs ? "pt-10" : "pt-5"} ${compact ? "pb-5" : "pb-12"}`}>
        {tab === "flights" && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm font-semibold">
              {[["One way", false], ["Round trip", true]].map(([l, v]) => (
                <label key={String(l)} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={round === v} onChange={() => setRound(v as boolean)} className="accent-brand-600" /> {l as string}
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
            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm font-semibold">
              {[["ONEWAY", "Outstation one-way"], ["ROUND", "Outstation round trip"], ["AIRPORT", "Airport transfer"]].map(([v, l]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={trip === v} onChange={() => setTrip(v)} className="accent-brand-600" /> {l}
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
        <div className={compact ? "mt-4 flex justify-end" : "absolute -bottom-6 left-1/2 -translate-x-1/2"}>
          <button className="btn-primary px-12 py-3.5 text-lg uppercase tracking-wide" data-testid="search-btn">
            <Search className="h-5 w-5" /> Search
          </button>
        </div>
      </form>
    </div>
  );
}
