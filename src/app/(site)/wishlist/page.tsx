import Link from "next/link";
import { Heart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Empty, Rating, Stars } from "@/components/ui";
import { toggleWishlistAction } from "@/app/actions/booking";
import { inr } from "@/lib/format";

export const metadata = { title: "Wishlist" };

export default async function Page() {
  const user = await requireUser("/wishlist");
  const w = await prisma.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const [hotels, pkgs] = await Promise.all([
    prisma.hotel.findMany({ where: { id: { in: w.filter((x) => x.kind === "HOTEL").map((x) => x.itemId) } }, include: { city: true, rooms: { orderBy: { price: "asc" }, take: 1 } } }),
    prisma.package.findMany({ where: { id: { in: w.filter((x) => x.kind === "HOLIDAY").map((x) => x.itemId) } }, include: { city: true } }),
  ]);
  const Remove = ({ kind, id }: { kind: string; id: string }) => (
    <form action={toggleWishlistAction} className="absolute right-3 top-3">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="itemId" value={id} /><input type="hidden" name="back" value="/wishlist" />
      <button className="grid h-9 w-9 place-items-center rounded-full bg-white/90" aria-label="Remove"><Heart className="h-5 w-5 fill-red-500 text-red-500" /></button>
    </form>
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-5 text-2xl font-bold">My wishlist</h1>
      {hotels.length + pkgs.length === 0 ? <Empty title="Your wishlist is empty" text="Tap the heart on any hotel or holiday to save it here."><Link href="/hotels" className="btn-primary">Explore hotels</Link></Empty> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((h) => (
            <div key={h.id} className="card relative overflow-hidden">
              <Link href={`/hotels/${h.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.images[0]} alt="" className="h-44 w-full object-cover" />
                <div className="p-4"><Stars n={h.stars} /><p className="font-bold">{h.name}</p><p className="text-xs text-slate-500">{h.city.name}</p><div className="mt-2 flex justify-between"><Rating v={h.rating} />{h.rooms[0] && <b>{inr(h.rooms[0].price)}</b>}</div></div>
              </Link>
              <Remove kind="HOTEL" id={h.id} />
            </div>
          ))}
          {pkgs.map((p) => (
            <div key={p.id} className="card relative overflow-hidden">
              <Link href={`/holidays/${p.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt="" className="h-44 w-full object-cover" />
                <div className="p-4"><p className="text-xs font-bold text-accent-600">{p.nights}N/{p.nights + 1}D</p><p className="font-bold">{p.title}</p><b>{inr(p.price)}</b></div>
              </Link>
              <Remove kind="HOLIDAY" id={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
