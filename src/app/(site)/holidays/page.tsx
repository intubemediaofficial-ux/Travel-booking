import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCities } from "@/lib/cities";
import { SearchWidget } from "@/components/SearchWidget";
import { Empty, SearchBand } from "@/components/ui";
import { FilterForm, FilterGroup, Check } from "@/components/FilterForm";
import { inr } from "@/lib/format";

export const metadata = { title: "Holiday packages" };
type SP = Record<string, string | string[] | undefined>;
const arr = (v: SP[string]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dest = one(sp.dest) ?? "";
  const cats = [...arr(sp.cat), ...arr(sp.c)].filter(Boolean);
  const dur = arr(sp.dur);
  const sort = one(sp.sort) ?? "popular";
  const [cities, all] = await Promise.all([getCities(), prisma.package.findMany({ where: { active: true }, include: { city: true } })]);
  let list = all.filter((p) =>
    (!dest || p.city.code === dest) && (!cats.length || cats.includes(p.category)) &&
    (!dur.length || dur.some((d) => (d === "s" ? p.nights <= 4 : d === "m" ? p.nights >= 5 && p.nights <= 6 : p.nights >= 7))));
  if (sort === "low") list = list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list = list.sort((a, b) => b.price - a.price);
  else list = list.sort((a, b) => Number(b.featured) - Number(a.featured));
  const categories = [...new Set(all.map((p) => p.category))];
  const keep = { dest, sort };
  return (
    <>
      <SearchBand><SearchWidget cities={cities} initial="holidays" tabs={false} compact params={{ dest, cat: cats[0] }} /></SearchBand>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 text-xl font-extrabold">Holiday packages {dest && `· ${cities.find((c) => c.code === dest)?.name}`}</h1>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="card h-fit p-5">
            <FilterForm keep={keep}>
              <FilterGroup title="Theme">{categories.map((c) => <Check key={c} name="c" value={c} label={c} checked={cats.includes(c)} />)}</FilterGroup>
              <FilterGroup title="Duration">
                <Check name="dur" value="s" label="Up to 4 nights" checked={dur.includes("s")} />
                <Check name="dur" value="m" label="5 – 6 nights" checked={dur.includes("m")} />
                <Check name="dur" value="l" label="7+ nights" checked={dur.includes("l")} />
              </FilterGroup>
            </FilterForm>
          </aside>
          <section>
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
              {[["popular", "Popular"], ["low", "Price: low to high"], ["high", "Price: high to low"]].map(([k, l]) => (
                <Link key={k} href={`/holidays?${new URLSearchParams({ ...keep, sort: k })}`} className={`rounded-full px-4 py-1.5 font-bold ${sort === k ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{l}</Link>
              ))}
              <span className="ml-auto self-center text-slate-500">{list.length} packages</span>
            </div>
            {list.length === 0 ? <Empty title="No packages found" text="Try another destination or theme."><Link href="/holidays" className="btn-primary">Show all packages</Link></Empty> : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => (
                  <Link key={p.id} href={`/holidays/${p.slug}`} className="card group overflow-hidden" data-testid="package-card">
                    <div className="relative h-48 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-brand-700">{p.nights}N/{p.nights + 1}D</span>
                      {p.originalPrice && <span className="absolute right-3 top-3 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-white">{Math.round((1 - p.price / p.originalPrice) * 100)}% OFF</span>}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold uppercase text-accent-600">{p.category} · {p.city.name}</p>
                      <h2 className="mt-1 font-extrabold text-slate-900">{p.title}</h2>
                      <ul className="mt-2 space-y-0.5 text-xs text-slate-600">{p.highlights.slice(0, 3).map((h) => <li key={h}>• {h}</li>)}</ul>
                      <p className="mt-3 text-sm text-slate-500">{p.originalPrice && <span className="mr-2 line-through">{inr(p.originalPrice)}</span>}<span className="text-xl font-extrabold text-slate-900">{inr(p.price)}</span> /person</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
