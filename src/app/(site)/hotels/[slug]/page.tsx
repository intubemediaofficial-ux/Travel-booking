import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Check, Clock, Users, BedDouble, Heart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { stayPrice, usedRooms } from "@/lib/inventory";
import { addDays, fmtDate, nightsBetween, todayIST } from "@/lib/format";
import { Rating, Stars } from "@/components/ui";
import { ReviewForm } from "@/components/ReviewForm";
import { StayPicker } from "@/components/StayPicker";
import { toggleWishlistAction } from "@/app/actions/booking";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const h = await prisma.hotel.findUnique({ where: { slug: (await params).slug }, select: { name: true, description: true } });
  return { title: h?.name ?? "Hotel", description: h?.description.slice(0, 160) };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const h = await prisma.hotel.findUnique({
    where: { slug },
    include: { city: true, rooms: { orderBy: { price: "asc" } }, reviews: { where: { approved: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!h || !h.active) notFound();
  const cin = sp.in && sp.in >= todayIST() ? sp.in : addDays(todayIST(), 7);
  const cout = sp.out && sp.out > cin ? sp.out : addDays(cin, 1);
  const rooms = Math.max(1, Number(sp.rooms) || 1);
  const guests = Math.max(1, Number(sp.guests) || 2);
  const [used, user] = await Promise.all([usedRooms(h.rooms.map((r) => r.id), cin, cout), getUser()]);
  const wished = user ? !!(await prisma.wishlist.findUnique({ where: { userId_kind_itemId: { userId: user.id, kind: "HOTEL", itemId: h.id } } })) : false;
  const nights = nightsBetween(cin, cout);
  const back = `/hotels/${slug}`;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-3 text-xs text-slate-500"><Link href="/">Home</Link> / <Link href={`/hotels?city=${h.city.code}`}>Hotels in {h.city.name}</Link> / {h.name}</nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Stars n={h.stars} /><span className="chip">{h.type}</span></div>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{h.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4 text-brand-600" /> {h.address}</p>
        </div>
        <div className="flex items-center gap-3">
          <Rating v={h.rating} count={h.reviewCount + h.reviews.length} />
          <form action={toggleWishlistAction}>
            <input type="hidden" name="kind" value="HOTEL" /><input type="hidden" name="itemId" value={h.id} /><input type="hidden" name="back" value={back} />
            <button className="btn-ghost" aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}><Heart className={`h-5 w-5 ${wished ? "fill-red-500 text-red-500" : ""}`} /> {wished ? "Saved" : "Save"}</button>
          </form>
        </div>
      </div>
      <div className="mt-5 grid h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl">
        {h.images.slice(0, 5).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className={`h-full w-full object-cover ${i === 0 ? "col-span-2 row-span-2" : ""}`} />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-2 text-xl font-extrabold">About the property</h2>
            <p className="leading-relaxed text-slate-600">{h.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{h.amenities.map((a) => <p key={a} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-600" /> {a}</p>)}</div>
          </section>
          <section id="rooms">
            <h2 className="mb-3 text-xl font-extrabold">Choose your room <span className="text-sm font-semibold text-slate-500">· {fmtDate(cin)} – {fmtDate(cout)}, {nights} night{nights > 1 ? "s" : ""}</span></h2>
            <div className="space-y-4">
              {h.rooms.map((r) => {
                const left = r.inventory - (used.get(r.id) ?? 0);
                const sp2 = stayPrice(r, cin, cout);
                const fits = r.maxGuests * rooms >= guests;
                const ok = left >= rooms && fits;
                return (
                  <div key={r.id} className="card grid overflow-hidden md:grid-cols-[220px_1fr_200px]" data-testid="room-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.image ?? h.images[0]} alt={r.name} className="h-44 w-full object-cover md:h-full" />
                    <div className="p-5">
                      <h3 className="text-lg font-extrabold">{r.name}</h3>
                      <p className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {r.bed}</span>
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Max {r.maxGuests}</span>
                        {r.size && <span>{r.size}</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{r.amenities.map((a) => <span key={a} className="chip">{a}</span>)}</div>
                      <ul className="mt-3 space-y-1 text-xs font-semibold">
                        <li className={r.breakfast ? "text-emerald-700" : "text-slate-500"}>{r.breakfast ? "✓ Breakfast included" : "Room only"}</li>
                        <li className={r.freeCancel ? "text-emerald-700" : "text-amber-700"}>{r.freeCancel ? "✓ Free cancellation till 24 hrs before check-in" : "Non-refundable (50% refund)"}</li>
                      </ul>
                    </div>
                    <div className="flex flex-col justify-center gap-1 border-l border-dashed p-5 text-right">
                      <p className="text-2xl font-extrabold">₹{sp2.perNight.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-slate-500">per room/night + taxes</p>
                      <p className="text-xs font-semibold">₹{(sp2.total * rooms).toLocaleString("en-IN")} for {rooms} room × {nights} night</p>
                      {ok ? (
                        <Link href={`/book/hotel?${new URLSearchParams({ room: r.id, in: cin, out: cout, rooms: String(rooms), guests: String(guests) })}`} className="btn-accent mt-2" data-testid="room-book">Book this room</Link>
                      ) : (
                        <span className="mt-2 text-xs font-bold text-red-600">{!fits ? `Max ${r.maxGuests} guests/room — add rooms` : "Sold out for these dates"}</span>
                      )}
                      {ok && left <= 3 && <p className="text-xs font-bold text-red-600">Only {left} left</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-extrabold">Guest reviews</h2>
            <div className="space-y-3">
              {h.reviews.length === 0 && <p className="text-sm text-slate-500">No reviews yet. Be the first to review!</p>}
              {h.reviews.map((rv) => (
                <div key={rv.id} className="card p-4">
                  <div className="flex items-center justify-between"><p className="font-bold">{rv.user.name}</p><span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-xs font-extrabold text-white">{rv.rating}/5</span></div>
                  {rv.title && <p className="mt-1 font-semibold">{rv.title}</p>}
                  <p className="mt-1 text-sm text-slate-600">{rv.comment}</p>
                  <p className="mt-1 text-xs text-slate-400">{fmtDate(rv.createdAt)}</p>
                </div>
              ))}
              <ReviewForm hotelId={h.id} loggedIn={!!user} back={back} />
            </div>
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <StayPicker cin={cin} cout={cout} rooms={rooms} guests={guests} />
          <div className="card p-5 text-sm">
            <h3 className="mb-2 font-extrabold">House rules</h3>
            <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" /> Check-in from {h.checkIn} · Check-out by {h.checkOut}</p>
            {h.policies && <p className="mt-2 text-slate-600">{h.policies}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
