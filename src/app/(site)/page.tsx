import Link from "next/link";
import { ArrowRight, BadgePercent, ShieldCheck, Headphones, Wallet, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCities } from "@/lib/cities";
import { getSettings } from "@/lib/settings";
import { SearchWidget, type Tab } from "@/components/SearchWidget";
import { inr } from "@/lib/format";
import { Rating, Stars } from "@/components/ui";
import { CopyCode } from "@/components/CopyCode";

export const dynamic = "force-dynamic";

const ROUTES = [["DEL", "BOM"], ["BOM", "GOI"], ["DEL", "BLR"], ["BLR", "HYD"], ["DEL", "SXR"], ["JAI", "BOM"], ["DEL", "DXB"], ["BOM", "SIN"]];

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: Tab }> }) {
  const { tab } = await searchParams;
  const [cities, s, offers, packages, hotels, popular, routeFares] = await Promise.all([
    getCities(),
    getSettings(),
    prisma.coupon.findMany({ where: { active: true, showAsOffer: true }, orderBy: { createdAt: "asc" }, take: 8 }),
    prisma.package.findMany({ where: { active: true, featured: true }, include: { city: true }, take: 8, orderBy: { price: "asc" } }),
    prisma.hotel.findMany({ where: { active: true, featured: true }, include: { city: true, rooms: { orderBy: { price: "asc" }, take: 1 } }, take: 8, orderBy: { rating: "desc" } }),
    prisma.city.findMany({ where: { popular: true }, take: 12, include: { _count: { select: { hotels: true } } } }),
    Promise.all(
      ROUTES.map(async ([a, b]) => {
        const f = await prisma.flight.aggregate({ where: { fromCity: { code: a }, toCity: { code: b }, active: true }, _min: { economyFare: true } });
        return { a, b, fare: f._min.economyFare };
      }),
    ),
  ]);
  const cityName = Object.fromEntries(cities.map((c) => [c.code, c.name]));
  return (
    <>
      <section className="relative bg-brand-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/40 via-brand-900/30 to-slate-100" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10">
          <div className="mb-8 text-center text-white">
            <h1 className="text-3xl font-extrabold drop-shadow md:text-5xl">{s.heroTitle}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-white/90 md:text-lg">{s.heroSubtitle}</p>
          </div>
          <SearchWidget cities={cities} initial={tab ?? "flights"} />
        </div>
      </section>

      {offers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900"><BadgePercent className="h-6 w-6 text-accent-500" /> Offers for you</h2>
            <Link href="/offers" className="text-sm font-bold text-brand-600">View all <ArrowRight className="inline h-4 w-4" /></Link>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-2">
            {offers.map((o) => (
              <div key={o.id} className="card flex w-80 shrink-0 snap-start overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.image ?? "/img/hero2.jpg"} alt="" className="h-auto w-28 object-cover" />
                <div className="flex flex-1 flex-col p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent-600">{o.appliesTo === "ALL" ? "All bookings" : o.appliesTo}</span>
                  <p className="mt-1 font-extrabold leading-snug text-slate-900">{o.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{o.description}</p>
                  <CopyCode code={o.code} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Popular destinations</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {popular.map((c) => (
            <Link key={c.id} href={`/hotels?city=${c.code}`} className="group relative h-48 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image ?? "/img/hero.jpg"} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-lg font-extrabold">{c.name}</p>
                <p className="text-xs text-white/80">{c._count.hotels} properties</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-slate-900">Holiday packages</h2>
          <Link href="/holidays" className="text-sm font-bold text-brand-600">Explore all <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p) => (
            <Link key={p.id} href={`/holidays/${p.slug}`} className="card group overflow-hidden">
              <div className="relative h-44 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-brand-700">{p.nights}N/{p.nights + 1}D</span>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold uppercase text-accent-600">{p.category}</p>
                <p className="mt-1 line-clamp-1 font-extrabold text-slate-900">{p.title}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {p.originalPrice && <span className="mr-2 line-through">{inr(p.originalPrice)}</span>}
                  <span className="text-lg font-extrabold text-slate-900">{inr(p.price)}</span> /person
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Top-rated hotels</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotels.map((h) => (
            <Link key={h.id} href={`/hotels/${h.slug}`} className="card group overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.images[1] ?? h.images[0]} alt={h.name} className="h-40 w-full object-cover" />
              <div className="p-4">
                <Stars n={h.stars} />
                <p className="mt-1 line-clamp-1 font-extrabold text-slate-900">{h.name}</p>
                <p className="text-xs text-slate-500">{h.locality}, {h.city.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Rating v={h.rating} />
                  {h.rooms[0] && <span className="text-sm font-extrabold">{inr(h.rooms[0].price)}<span className="text-xs font-normal text-slate-500">/night</span></span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Trending flight routes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {routeFares.map((r) => (
            <Link key={r.a + r.b} href={`/flights?from=${r.a}&to=${r.b}`} className="card flex items-center justify-between p-4 hover:ring-brand-300">
              <div>
                <p className="font-extrabold text-slate-900">{cityName[r.a]} → {cityName[r.b]}</p>
                <p className="text-xs text-slate-500">{r.a} – {r.b}</p>
              </div>
              {r.fare && <span className="text-sm font-bold text-emerald-700">from {inr(r.fare)}</span>}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 rounded-3xl bg-gradient-to-r from-brand-700 to-brand-900 p-8 text-white md:grid-cols-4">
          <div className="md:col-span-1">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold"><Sparkles className="h-6 w-6 text-accent-500" /> Why {s.siteName}?</h2>
          </div>
          {[
            [ShieldCheck, "Secure & trusted", "PCI-compliant payments and instant e-tickets."],
            [Wallet, "Instant refunds", "Cancel online and get refunds straight to your wallet."],
            [Headphones, "Always here", `Call ${s.supportPhone} for help any time.`],
          ].map(([I, t, d]) => {
            const Icon = I as typeof ShieldCheck;
            return (
              <div key={t as string} className="rounded-2xl bg-white/10 p-5">
                <Icon className="h-7 w-7 text-accent-500" />
                <p className="mt-2 font-extrabold">{t as string}</p>
                <p className="text-sm text-white/80">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
