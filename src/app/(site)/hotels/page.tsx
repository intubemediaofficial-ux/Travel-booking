import Link from "next/link";
import { MapPin, Coffee, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCities } from "@/lib/cities";
import { SearchWidget } from "@/components/SearchWidget";
import { FilterForm, FilterGroup, Check } from "@/components/FilterForm";
import { Empty, Rating, SearchBand, Stars } from "@/components/ui";
import { stayPrice, usedRooms } from "@/lib/inventory";
import { addDays, fmtDate, nightsBetween, todayIST } from "@/lib/format";

export const metadata = { title: "Hotels" };
type SP = Record<string, string | string[] | undefined>;
const arr = (v: SP[string]) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v);
const PRICES: [string, string, number, number][] = [["0", "Up to ₹2,500", 0, 2500], ["1", "₹2,500 – ₹5,000", 2500, 5000], ["2", "₹5,000 – ₹10,000", 5000, 10000], ["3", "₹10,000+", 10000, 1e9]];
const AMEN = ["Free WiFi", "Swimming Pool", "Spa", "Restaurant", "Gym", "Parking", "Airport Shuttle", "Bar"];

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const city = one(sp.city) ?? "GOI";
  const cin = one(sp.in) && one(sp.in)! >= todayIST() ? one(sp.in)! : addDays(todayIST(), 7);
  const cout = one(sp.out) && one(sp.out)! > cin ? one(sp.out)! : addDays(cin, 1);
  const rooms = Math.max(1, Number(one(sp.rooms) ?? 1) || 1);
  const guests = Math.max(1, Number(one(sp.guests) ?? 2) || 2);
  const stars = arr(sp.stars);
  const prices = arr(sp.price);
  const amen = arr(sp.amen);
  const freeCancel = one(sp.fc) === "1";
  const bf = one(sp.bf) === "1";
  const q = (one(sp.q) ?? "").trim();
  const sort = one(sp.sort) ?? "popular";
  const [cities, hotels] = await Promise.all([
    getCities(),
    prisma.hotel.findMany({
      where: {
        active: true, city: { code: city },
        ...(stars.length ? { stars: { in: stars.map(Number) } } : {}),
        ...(amen.length ? { amenities: { hasEvery: amen } } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { locality: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { city: true, rooms: { orderBy: { price: "asc" } } },
    }),
  ]);
  const used = await usedRooms(hotels.flatMap((h) => h.rooms.map((r) => r.id)), cin, cout);
  const nights = nightsBetween(cin, cout);
  let list = hotels
    .map((h) => {
      const avail = h.rooms.filter((r) => r.inventory - (used.get(r.id) ?? 0) >= rooms && r.maxGuests * rooms >= guests && (!freeCancel || r.freeCancel) && (!bf || r.breakfast));
      const best = avail[0];
      return { h, best, per: best ? stayPrice(best, cin, cout).perNight : 0, left: best ? best.inventory - (used.get(best.id) ?? 0) : 0 };
    })
    .filter((x) => x.best && (!prices.length || prices.some((p) => { const r = PRICES[Number(p)]; return r && x.per >= r[2] && x.per < r[3]; })));
  if (sort === "low") list.sort((a, b) => a.per - b.per);
  else if (sort === "high") list.sort((a, b) => b.per - a.per);
  else if (sort === "rating") list.sort((a, b) => b.h.rating - a.h.rating);
  else list.sort((a, b) => Number(b.h.featured) - Number(a.h.featured) || b.h.reviewCount - a.h.reviewCount);
  list = list.slice(0, 60);
  const keep = { city, in: cin, out: cout, rooms: String(rooms), guests: String(guests), sort };
  const cityName = cities.find((c) => c.code === city)?.name ?? city;
  const qs = (o: Record<string, string>) => new URLSearchParams({ ...keep, ...o }).toString();
  const stay = new URLSearchParams({ in: cin, out: cout, rooms: String(rooms), guests: String(guests) }).toString();
  return (
    <>
      <SearchBand><SearchWidget cities={cities} initial="hotels" tabs={false} compact params={{ city, in: cin, out: cout, rooms: String(rooms), guests: String(guests) }} /></SearchBand>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">Hotels in {cityName} <span className="text-sm font-semibold text-slate-500">· {fmtDate(cin)} – {fmtDate(cout)} · {nights} night{nights > 1 ? "s" : ""} · {rooms} room, {guests} guests</span></h1>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="card h-fit overflow-hidden p-5 lg:sticky lg:top-24"><p className="-mx-5 -mt-5 mb-4 flex items-center justify-between bg-brand-900 px-5 py-3 text-sm font-semibold text-white">Refine results <span className="h-2 w-2 rounded-full bg-accent-500" /></p>
            <FilterForm keep={keep}>
              <div><label className="label">Search by hotel or area</label><input name="q" defaultValue={q} className="input" placeholder="e.g. Baga, Taj" /></div>
              <FilterGroup title="Price per night">{PRICES.map(([v, l]) => <Check key={v} name="price" value={v} label={l} checked={prices.includes(v)} />)}</FilterGroup>
              <FilterGroup title="Star category">{[5, 4, 3, 2].map((s) => <Check key={s} name="stars" value={String(s)} label={`${s} Star`} checked={stars.includes(String(s))} />)}</FilterGroup>
              <FilterGroup title="Booking options">
                <Check name="fc" value="1" label="Free cancellation" checked={freeCancel} />
                <Check name="bf" value="1" label="Breakfast included" checked={bf} />
              </FilterGroup>
              <FilterGroup title="Amenities">{AMEN.map((a) => <Check key={a} name="amen" value={a} label={a} checked={amen.includes(a)} />)}</FilterGroup>
            </FilterForm>
          </aside>
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {[["popular", "Popular"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["rating", "User rating"]].map(([k, l]) => (
                <Link key={k} href={`/hotels?${qs({ sort: k })}`} className={`border-b-2 px-3 py-2 font-semibold transition ${sort === k ? "border-accent-500 text-brand-800" : "border-transparent text-slate-500 hover:text-brand-700"}`}>{l}</Link>
              ))}
              <span className="ml-auto self-center text-slate-500">{list.length} properties</span>
            </div>
            {list.length === 0 ? <Empty title="No hotels match" text="Try changing dates, guests or filters." /> : list.map(({ h, best, per, left }) => (
              <Link key={h.id} href={`/hotels/${h.slug}?${stay}`} className="card grid overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl md:grid-cols-[260px_1fr_190px]" data-testid="hotel-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.images[0]} alt={h.name} className="h-52 w-full object-cover md:h-full" />
                <div className="p-5">
                  <div className="flex items-center gap-2"><Stars n={h.stars} /><span className="text-xs text-slate-500">{h.type}</span></div>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{h.name}</h2>
                  <p className="flex items-center gap-1 text-sm text-brand-700"><MapPin className="h-3.5 w-3.5" /> {h.locality}, {h.city.name}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{h.amenities.slice(0, 5).map((a) => <span key={a} className="chip">{a}</span>)}</div>
                  <div className="mt-3 space-y-1 text-xs font-semibold">
                    {best!.freeCancel && <p className="flex items-center gap-1 text-emerald-700"><BadgeCheck className="h-4 w-4" /> Free cancellation</p>}
                    {best!.breakfast && <p className="flex items-center gap-1 text-emerald-700"><Coffee className="h-4 w-4" /> Breakfast included</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between border-l border-dashed p-5">
                  <Rating v={h.rating} count={h.reviewCount} />
                  <div className="text-right">
                    {left <= 3 && <p className="text-xs font-bold text-red-600">Only {left} left!</p>}
                    <p className="text-xs text-slate-400 line-through">₹{Math.round(per * 1.25).toLocaleString("en-IN")}</p>
                    <p className="text-2xl font-bold">₹{per.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-slate-500">per night + taxes</p>
                    <span className="btn-primary mt-2">View rooms</span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
