import Link from "next/link";
import { TrainFront, Utensils } from "lucide-react";
import { getCities } from "@/lib/cities";
import { SearchWidget } from "@/components/SearchWidget";
import { Empty, SearchBand } from "@/components/ui";
import { FilterForm, FilterGroup, Check } from "@/components/FilterForm";
import { searchTrains } from "@/lib/inventory";
import { addDays, duration, fmtDate, timeSlot, todayIST } from "@/lib/format";

export const metadata = { title: "Trains" };
type SP = Record<string, string | string[] | undefined>;
const arr = (v: SP[string]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = one(sp.from) ?? "DEL";
  const to = one(sp.to) ?? "JAI";
  const date = one(sp.date) && one(sp.date)! >= todayIST() ? one(sp.date)! : addDays(todayIST(), 7);
  const pax = Math.min(6, Math.max(1, Number(one(sp.pax)) || 1));
  const classes = arr(sp.cls);
  const slots = arr(sp.dep);
  const avail = one(sp.avail) === "1";
  const [cities, all] = await Promise.all([getCities(), searchTrains(from, to, date)]);
  const list = all.filter((t) => (!slots.length || slots.includes(timeSlot(t.departTime))) && (!classes.length || t.cls.some((c) => classes.includes(c.code))) && (!avail || t.cls.some((c) => c.left >= pax)));
  const allCls = [...new Set(all.flatMap((t) => t.cls.map((c) => c.code)))];
  const cn = Object.fromEntries(cities.map((c) => [c.code, c]));
  const keep = { from, to, date, pax: String(pax) };
  return (
    <>
      <SearchBand><SearchWidget cities={cities} initial="trains" tabs={false} compact params={{ from, to, date }} /></SearchBand>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold"><TrainFront className="h-5 w-5 text-brand-600" /> {cn[from]?.station ?? from} → {cn[to]?.station ?? to} <span className="text-sm font-semibold text-slate-500">· {fmtDate(date, { weekday: "short" })}</span></h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Passengers:</span>
            {[1, 2, 3, 4, 5, 6].map((n) => <Link key={n} href={`/trains?${new URLSearchParams({ ...keep, pax: String(n) })}`} className={`grid h-8 w-8 place-items-center rounded-full font-bold ${n === pax ? "bg-brand-600 text-white" : "bg-white ring-1 ring-slate-200"}`}>{n}</Link>)}
            <Link href="/trains/pnr" className="ml-3 font-bold text-brand-600">Check PNR status</Link>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit overflow-hidden p-5 lg:sticky lg:top-24"><p className="-mx-5 -mt-5 mb-4 flex items-center justify-between bg-brand-900 px-5 py-3 text-sm font-semibold text-white">Refine results <span className="h-2 w-2 rounded-full bg-accent-500" /></p>
            <FilterForm keep={keep}>
              <FilterGroup title="Availability"><Check name="avail" value="1" label="Show available only" checked={avail} /></FilterGroup>
              <FilterGroup title="Class">{allCls.map((c) => <Check key={c} name="cls" value={c} label={c} checked={classes.includes(c)} />)}</FilterGroup>
              <FilterGroup title="Departure">{[["early", "Before 6 AM"], ["morning", "6 AM – 12 PM"], ["afternoon", "12 PM – 6 PM"], ["night", "After 6 PM"]].map(([v, l]) => <Check key={v} name="dep" value={v} label={l} checked={slots.includes(v)} />)}</FilterGroup>
            </FilterForm>
          </aside>
          <section className="space-y-4">
            <p className="text-sm text-slate-500">{list.length} trains</p>
            {list.length === 0 ? <Empty title="No trains found" text="No trains run on this route/date. Try another date." /> : list.map((t) => (
              <div key={t.id} className="card border-l-4 border-l-brand-700 p-5 transition hover:border-l-accent-500 hover:shadow-lg" data-testid="train-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{t.name} <span className="text-sm font-semibold text-slate-500">#{t.number}</span></p>
                    <p className="text-xs text-slate-500">Runs on: {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter((_, i) => t.days.includes(String(i + 1))).join(", ")} {t.pantry && <span className="ml-2 inline-flex items-center gap-1 text-emerald-700"><Utensils className="h-3 w-3" /> Pantry</span>}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center"><p className="text-xl font-bold">{t.departTime}</p><p className="text-xs text-slate-500">{t.fromCity.station}</p></div>
                    <div className="text-xs text-slate-500">— {duration(t.durationMins)} —</div>
                    <div className="text-center"><p className="text-xl font-bold">{t.arrTime}{t.arrDays > 0 && <sup className="text-xs text-red-500"> +{t.arrDays}</sup>}</p><p className="text-xs text-slate-500">{t.toCity.station}</p></div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {t.cls.map((c) => {
                    const ok = c.left >= pax;
                    const wl = c.left === 0;
                    return (
                      <Link key={c.code} aria-disabled={!ok} href={ok ? `/book/train?${new URLSearchParams({ t: t.id, cls: c.code, date, pax: String(pax) })}` : "#"}
                        className={`rounded-xl border p-3 transition ${ok ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-500" : "pointer-events-none border-slate-200 bg-slate-50 opacity-70"}`} data-testid="train-class">
                        <p className="flex justify-between text-sm font-bold"><span>{c.code}</span><span>₹{c.fare.toLocaleString("en-IN")}</span></p>
                        <p className="text-[11px] text-slate-500">{c.name}</p>
                        <p className={`mt-1 text-xs font-bold ${wl ? "text-red-600" : c.left < 20 ? "text-amber-700" : "text-emerald-700"}`}>{wl ? "Not available" : `AVL ${c.left}`}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
