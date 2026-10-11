import Link from "next/link";
import { Car, Users, Briefcase, Snowflake } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCities } from "@/lib/cities";
import { SearchWidget } from "@/components/SearchWidget";
import { SearchBand, Empty } from "@/components/ui";
import { cabDistance, cabFare, type CabTrip } from "@/lib/inventory";
import { addDays, fmtDate, nightsBetween, todayIST } from "@/lib/format";

export const metadata = { title: "Cabs" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const trip = (["ONEWAY", "ROUND", "AIRPORT"].includes(sp.trip) ? sp.trip : "ONEWAY") as CabTrip;
  const from = sp.from ?? "DEL";
  const to = sp.to ?? "JAI";
  const date = sp.date && sp.date >= todayIST() ? sp.date : addDays(todayIST(), 2);
  const time = /^\d{2}:\d{2}$/.test(sp.time ?? "") ? sp.time : "09:00";
  const ret = trip === "ROUND" ? (sp.ret && sp.ret >= date ? sp.ret : date) : "";
  const [cities, a, b, cabs] = await Promise.all([
    getCities(), prisma.city.findUnique({ where: { code: from } }), prisma.city.findUnique({ where: { code: to } }),
    prisma.cabType.findMany({ where: { active: true }, orderBy: { perKm: "asc" } }),
  ]);
  const days = ret ? nightsBetween(date, ret) + 1 : 1;
  const invalid = !a || (trip !== "AIRPORT" && (!b || a.id === b.id));
  const dist = invalid ? 0 : cabDistance(a!, trip === "AIRPORT" ? null : b, trip, days);
  return (
    <>
      <SearchBand><SearchWidget cities={cities} initial="cabs" tabs={false} compact params={{ trip, from, to, date, time, ret }} /></SearchBand>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {invalid ? <Empty title="Choose different pickup & drop cities" /> : (
          <>
            <h1 className="mb-1 flex items-center gap-2 text-xl font-bold"><Car className="h-5 w-5 text-brand-600" /> {trip === "AIRPORT" ? `${a!.name} airport transfer` : `${a!.name} → ${b!.name}${trip === "ROUND" ? ` → ${a!.name}` : ""}`}</h1>
            <p className="mb-5 text-sm text-slate-500">{fmtDate(date, { weekday: "short" })} {time}{ret && ` – ${fmtDate(ret)}`} · approx {dist} km{trip === "ROUND" ? ` · ${days} day${days > 1 ? "s" : ""}` : ""}</p>
            <div className="space-y-4">
              {cabs.map((c) => {
                const fare = cabFare(c, dist, trip, days);
                return (
                  <div key={c.id} className="card grid items-center gap-4 overflow-hidden md:grid-cols-[200px_1fr_200px]" data-testid="cab-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image ?? "/img/cab.jpg"} alt={c.name} className="h-36 w-full object-cover md:h-full" />
                    <div className="p-4">
                      <p className="text-lg font-bold">{c.name}</p>
                      <p className="text-sm text-slate-500">{c.models} or similar</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="chip"><Users className="h-3.5 w-3.5" /> {c.seats} seats</span>
                        <span className="chip"><Briefcase className="h-3.5 w-3.5" /> {c.bags} bags</span>
                        {c.ac && <span className="chip"><Snowflake className="h-3.5 w-3.5" /> AC</span>}
                        <span className="chip">₹{c.perKm}/km</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-emerald-700">Free cancellation up to 6 hrs before pickup</p>
                    </div>
                    <div className="p-4 text-right">
                      <p className="text-2xl font-bold">₹{fare.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-slate-500">incl. driver allowance & fuel</p>
                      <Link href={`/book/cab?${new URLSearchParams({ cab: c.id, trip, from, to, date, time, ...(ret ? { ret } : {}) })}`} className="btn-accent mt-2" data-testid="cab-book">Book cab</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
