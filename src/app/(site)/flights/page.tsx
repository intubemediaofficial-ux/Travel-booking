import Link from "next/link";
import { Plane, Utensils, Luggage, ArrowRight } from "lucide-react";
import { getCities } from "@/lib/cities";
import { SearchWidget } from "@/components/SearchWidget";
import { FilterForm, FilterGroup, Check } from "@/components/FilterForm";
import { Empty, SearchBand } from "@/components/ui";
import { CABIN, fareCalendar, searchFlights, type Cabin } from "@/lib/inventory";
import { addDays, duration, fmtDate, timeSlot, todayIST } from "@/lib/format";

export const metadata = { title: "Flights" };

type SP = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SLOTS: [string, string][] = [["early", "Before 6 AM"], ["morning", "6 AM – 12 PM"], ["afternoon", "12 PM – 6 PM"], ["night", "After 6 PM"]];

type FlightRow = Awaited<ReturnType<typeof searchFlights>>[number];

function FlightCard({ f, href, cta, pax }: { f: FlightRow; href: string; cta: string; pax: number }) {
  return (
    <div className="card border-l-4 border-l-brand-700 p-5 transition hover:border-l-accent-500 hover:shadow-lg" data-testid="flight-card">
      <div className="grid items-center gap-4 md:grid-cols-[180px_1fr_150px]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold text-white" style={{ background: f.airline.color }}>{f.airline.code}</span>
          <div>
            <p className="font-bold text-slate-900">{f.airline.name}</p>
            <p className="text-xs text-slate-500">{f.flightNo}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-center">
            <p className="text-xl font-bold">{f.departTime}</p>
            <p className="text-xs text-slate-500">{f.fromCity.code}</p>
          </div>
          <div className="flex flex-1 flex-col items-center text-xs text-slate-500">
            <span>{duration(f.durationMins)}</span>
            <span className="my-1 h-0.5 w-full rounded bg-gradient-to-r from-brand-200 via-brand-500 to-brand-200" />
            <span className={f.stops ? "text-amber-700" : "text-emerald-700"}>{f.stops ? `${f.stops} stop · ${f.stopCity}` : "Non-stop"}</span>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{f.arrTime}{f.arrDays > 0 && <sup className="text-xs text-red-500"> +{f.arrDays}</sup>}</p>
            <p className="text-xs text-slate-500">{f.toCity.code}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-2xl font-bold text-slate-900">₹{f.fare.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500">per adult</p>
          {f.available ? (
            <Link href={href} className="btn-primary w-full" data-testid="flight-book">{cta}</Link>
          ) : (
            <span className="btn-ghost w-full cursor-not-allowed opacity-60">Sold out</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed pt-3 text-xs">
        <span className="chip"><Luggage className="h-3.5 w-3.5" /> {f.baggage}</span>
        {f.meal && <span className="chip"><Utensils className="h-3.5 w-3.5" /> Free meal</span>}
        <span className={`chip ${f.refundable ? "text-emerald-700" : "text-red-600"}`}>{f.refundable ? "Refundable" : "Non-refundable"}</span>
        {f.seatsLeft < 10 && f.available && <span className="chip text-red-600">Only {f.seatsLeft} seats left at this fare{pax > 1 ? "" : ""}</span>}
      </div>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = one(sp.from) ?? "DEL";
  const to = one(sp.to) ?? "BOM";
  const date = one(sp.date) && one(sp.date)! >= todayIST() ? one(sp.date)! : addDays(todayIST(), 7);
  const ret = one(sp.ret) && one(sp.ret)! >= date ? one(sp.ret)! : "";
  const cls = (["E", "P", "B"].includes(one(sp.cls) ?? "") ? one(sp.cls) : "E") as Cabin;
  const ad = Math.max(1, Number(one(sp.ad) ?? 1) || 1);
  const ch = Math.max(0, Number(one(sp.ch) ?? 0) || 0);
  const pax = ad + ch;
  const onward = one(sp.f);
  const leg = ret && onward ? "return" : "onward";
  const [legFrom, legTo, legDate] = leg === "return" ? [to, from, ret] : [from, to, date];

  const [cities, all, cal] = await Promise.all([getCities(), searchFlights(legFrom, legTo, legDate, cls, pax), fareCalendar(legFrom, legTo, legDate, cls)]);
  const airlines = arr(sp.airline);
  const stops = arr(sp.stops);
  const slots = arr(sp.dep);
  const refundOnly = one(sp.refundable) === "1";
  const sort = one(sp.sort) ?? "cheapest";
  let list = all.filter(
    (f) =>
      (!airlines.length || airlines.includes(f.airline.code)) &&
      (!stops.length || stops.includes(String(Math.min(1, f.stops)))) &&
      (!slots.length || slots.includes(timeSlot(f.departTime))) &&
      (!refundOnly || f.refundable),
  );
  if (sort === "fastest") list = [...list].sort((a, b) => a.durationMins - b.durationMins);
  if (sort === "early") list = [...list].sort((a, b) => a.departTime.localeCompare(b.departTime));
  if (sort === "late") list = [...list].sort((a, b) => b.departTime.localeCompare(a.departTime));
  const airlineOpts = [...new Map(all.map((f) => [f.airline.code, f.airline.name])).entries()];
  const cn = Object.fromEntries(cities.map((c) => [c.code, c.name]));
  const keep = { from, to, date, ret, cls, ad: String(ad), ch: String(ch), f: onward, sort };
  const qs = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries({ ...keep, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  const bookBase = { date, cls, ad: String(ad), ch: String(ch) };
  const hrefFor = (id: string) =>
    !ret ? `/book/flight?${new URLSearchParams({ ...bookBase, f: id })}` : leg === "onward" ? `/flights?${qs({ f: id })}` : `/book/flight?${new URLSearchParams({ ...bookBase, f: onward!, r: id, rdate: ret })}`;

  return (
    <>
      <SearchBand>
        <SearchWidget cities={cities} initial="flights" tabs={false} compact params={{ from, to, date, ret, cls, ad: String(ad), ch: String(ch) }} />
      </SearchBand>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Plane className="h-5 w-5 text-brand-600" /> {leg === "return" ? "Select return flight: " : ret ? "Select onward flight: " : "Flights from "}
            {cn[legFrom]} <ArrowRight className="h-4 w-4" /> {cn[legTo]}
            <span className="text-sm font-semibold text-slate-500">· {fmtDate(legDate, { weekday: "short" })} · {CABIN[cls]} · {pax} traveller{pax > 1 ? "s" : ""}</span>
          </h1>
          {leg === "return" && <Link href={`/flights?${qs({ f: undefined })}`} className="text-sm font-bold text-brand-600">← Change onward flight</Link>}
        </div>
        <div className="mb-5 flex gap-2 overflow-x-auto">
          {cal.map((c) => (
            <Link key={c.date} href={`/flights?${qs(leg === "return" ? { ret: c.date } : { date: c.date, f: undefined })}`}
              className={`min-w-28 rounded-xl border px-3 py-2 text-center text-xs ${c.date === legDate ? "border-brand-500 bg-brand-50 font-bold text-brand-700" : "border-slate-200 bg-white hover:border-brand-300"}`}>
              <p>{fmtDate(c.date, { weekday: "short" })}</p>
              <p className={`mt-0.5 font-bold ${c.fare ? "text-slate-900" : "text-slate-400"}`}>{c.fare ? `₹${c.fare.toLocaleString("en-IN")}` : "—"}</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="card h-fit overflow-hidden p-5 lg:sticky lg:top-24"><p className="-mx-5 -mt-5 mb-4 flex items-center justify-between bg-brand-900 px-5 py-3 text-sm font-semibold text-white">Refine results <span className="h-2 w-2 rounded-full bg-accent-500" /></p>
            <FilterForm keep={keep}>
              <FilterGroup title="Stops">
                <Check name="stops" value="0" label="Non-stop" checked={stops.includes("0")} extra={String(all.filter((f) => !f.stops).length)} />
                <Check name="stops" value="1" label="1+ stop" checked={stops.includes("1")} extra={String(all.filter((f) => f.stops).length)} />
              </FilterGroup>
              <FilterGroup title="Departure time">
                {SLOTS.map(([v, l]) => <Check key={v} name="dep" value={v} label={l} checked={slots.includes(v)} />)}
              </FilterGroup>
              <FilterGroup title="Airlines">
                {airlineOpts.map(([c, n]) => <Check key={c} name="airline" value={c} label={n} checked={airlines.includes(c)} extra={`₹${Math.min(...all.filter((f) => f.airline.code === c).map((f) => f.fare)).toLocaleString("en-IN")}`} />)}
              </FilterGroup>
              <FilterGroup title="Fare type">
                <Check name="refundable" value="1" label="Refundable only" checked={refundOnly} />
              </FilterGroup>
            </FilterForm>
          </aside>
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {[["cheapest", "Cheapest"], ["fastest", "Fastest"], ["early", "Early departure"], ["late", "Late departure"]].map(([k, l]) => (
                <Link key={k} href={`/flights?${qs({ sort: k })}`} className={`border-b-2 px-3 py-2 font-semibold transition ${sort === k ? "border-accent-500 text-brand-800" : "border-transparent text-slate-500 hover:text-brand-700"}`}>{l}</Link>
              ))}
              <span className="ml-auto self-center text-slate-500">{list.length} flights</span>
            </div>
            {list.length === 0 ? (
              <Empty title="No flights found" text={all.length ? "Try removing some filters." : "No flights operate on this route/date. Try another date or nearby city."} />
            ) : (
              list.map((f) => <FlightCard key={f.id} f={f} pax={pax} href={hrefFor(f.id)} cta={ret && leg === "onward" ? "Select" : "Book now"} />)
            )}
          </section>
        </div>
      </div>
    </>
  );
}
