import Link from "next/link";
import { Bus, Star } from "lucide-react";
import { getCities } from "@/lib/cities";
import { SearchWidget } from "@/components/SearchWidget";
import { Empty, SearchBand } from "@/components/ui";
import { FilterForm, FilterGroup, Check } from "@/components/FilterForm";
import { searchBuses } from "@/lib/inventory";
import { addDays, duration, fmtDate, timeSlot, todayIST } from "@/lib/format";

export const metadata = { title: "Bus tickets" };
type SP = Record<string, string | string[] | undefined>;
const arr = (v: SP[string]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = one(sp.from) ?? "DEL";
  const to = one(sp.to) ?? "JAI";
  const date = one(sp.date) && one(sp.date)! >= todayIST() ? one(sp.date)! : addDays(todayIST(), 7);
  const types = arr(sp.type);
  const ops = arr(sp.op);
  const slots = arr(sp.dep);
  const sort = one(sp.sort) ?? "dep";
  const [cities, all] = await Promise.all([getCities(), searchBuses(from, to, date)]);
  let list = all.filter((b) =>
    (!types.length || types.some((t) => (t === "sleeper" ? b.sleeper : t === "seater" ? !b.sleeper : t === "ac" ? !b.busType.includes("Non") : b.busType.includes("Non")))) &&
    (!ops.length || ops.includes(b.operator)) && (!slots.length || slots.includes(timeSlot(b.departTime))));
  if (sort === "cheap") list = [...list].sort((a, b) => a.fare - b.fare);
  if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
  if (sort === "fast") list = [...list].sort((a, b) => a.durationMins - b.durationMins);
  const operators = [...new Set(all.map((b) => b.operator))];
  const cn = Object.fromEntries(cities.map((c) => [c.code, c.name]));
  const keep = { from, to, date, sort };
  return (
    <>
      <SearchBand><SearchWidget cities={cities} initial="buses" tabs={false} compact params={{ from, to, date }} /></SearchBand>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold"><Bus className="h-5 w-5 text-brand-600" /> {cn[from]} → {cn[to]} <span className="text-sm font-semibold text-slate-500">· {fmtDate(date, { weekday: "short" })}</span></h1>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit p-5">
            <FilterForm keep={keep}>
              <FilterGroup title="Bus type">{[["sleeper", "Sleeper"], ["seater", "Seater"], ["ac", "AC"], ["nonac", "Non-AC"]].map(([v, l]) => <Check key={v} name="type" value={v} label={l} checked={types.includes(v)} />)}</FilterGroup>
              <FilterGroup title="Departure">{[["early", "Before 6 AM"], ["morning", "6 AM – 12 PM"], ["afternoon", "12 PM – 6 PM"], ["night", "After 6 PM"]].map(([v, l]) => <Check key={v} name="dep" value={v} label={l} checked={slots.includes(v)} />)}</FilterGroup>
              <FilterGroup title="Operators">{operators.map((o) => <Check key={o} name="op" value={o} label={o} checked={ops.includes(o)} />)}</FilterGroup>
            </FilterForm>
          </aside>
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {[["dep", "Departure"], ["cheap", "Cheapest"], ["rating", "Top rated"], ["fast", "Fastest"]].map(([k, l]) => (
                <Link key={k} href={`/buses?${new URLSearchParams({ ...keep, sort: k })}`} className={`rounded-full px-4 py-1.5 font-bold ${sort === k ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{l}</Link>
              ))}
              <span className="ml-auto self-center text-slate-500">{list.length} buses</span>
            </div>
            {list.length === 0 ? <Empty title="No buses found" text="Try another date or remove filters." /> : list.map((b) => (
              <div key={b.id} className="card grid items-center gap-4 p-5 md:grid-cols-[1.3fr_1.5fr_1fr]" data-testid="bus-card">
                <div>
                  <p className="text-lg font-extrabold">{b.operator}</p>
                  <p className="text-xs text-slate-500">{b.busType}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white"><Star className="h-3 w-3 fill-white" /> {b.rating.toFixed(1)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{b.amenities.slice(0, 4).map((a) => <span key={a} className="chip">{a}</span>)}</div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div><p className="text-xl font-extrabold">{b.departTime}</p><p className="text-xs text-slate-500">{b.boarding[0]}</p></div>
                  <p className="text-xs text-slate-500">{duration(b.durationMins)}</p>
                  <div className="text-right"><p className="text-xl font-extrabold">{b.arrTime}{b.arrDays > 0 && <sup className="text-xs text-red-500"> +1</sup>}</p><p className="text-xs text-slate-500">{b.dropping[0]}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Starts from</p>
                  <p className="text-2xl font-extrabold">₹{b.fare.toLocaleString("en-IN")}</p>
                  <p className={`text-xs font-bold ${b.seatsLeft < 8 ? "text-red-600" : "text-emerald-700"}`}>{b.seatsLeft} seats left</p>
                  {b.seatsLeft > 0 ? <Link href={`/buses/${b.id}?date=${date}`} className="btn-primary mt-2" data-testid="bus-select">Select seats</Link> : <span className="btn-ghost mt-2 opacity-60">Sold out</span>}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
