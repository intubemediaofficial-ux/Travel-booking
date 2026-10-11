import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { inr, addDays, todayIST } from "@/lib/format";
import { HolidayBook } from "@/components/HolidayBook";
import { EnquiryForm } from "@/components/EnquiryForm";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await prisma.package.findUnique({ where: { slug: (await params).slug }, select: { title: true } });
  return { title: p?.title ?? "Holiday package" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.package.findUnique({ where: { slug }, include: { city: true } });
  if (!p || !p.active) notFound();
  const itin = (p.itinerary as { day: number; title: string; desc: string }[]) ?? [];
  return (
    <div>
      <div className="relative h-[380px] bg-brand-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8 text-white">
          <nav className="mb-2 text-xs text-white/70"><Link href="/holidays">Holidays</Link> / {p.city.name}</nav>
          <span className="w-fit rounded-full bg-accent-500 px-3 py-1 text-xs font-bold">{p.category}</span>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{p.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-white/90"><MapPin className="h-4 w-4" /> {p.city.name} · {p.nights} Nights / {p.nights + 1} Days</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="mb-3 text-xl font-extrabold">Highlights</h2>
            <ul className="grid gap-2 sm:grid-cols-2">{p.highlights.map((h) => <li key={h} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-600" /> {h}</li>)}</ul>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 text-xl font-extrabold">Day-wise itinerary</h2>
            <ol className="relative space-y-5 border-l-2 border-brand-100 pl-6">
              {itin.map((d) => (
                <li key={d.day} className="relative">
                  <span className="absolute -left-[34px] grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-extrabold text-white">{d.day}</span>
                  <p className="font-extrabold">Day {d.day}: {d.title}</p>
                  <p className="text-sm text-slate-600">{d.desc}</p>
                </li>
              ))}
            </ol>
          </section>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card p-6"><h2 className="mb-3 text-lg font-extrabold">Inclusions</h2><ul className="space-y-1.5">{p.inclusions.map((x) => <li key={x} className="flex gap-2 text-sm"><Check className="h-4 w-4 text-emerald-600" /> {x}</li>)}</ul></section>
            <section className="card p-6"><h2 className="mb-3 text-lg font-extrabold">Exclusions</h2><ul className="space-y-1.5">{p.exclusions.map((x) => <li key={x} className="flex gap-2 text-sm"><X className="h-4 w-4 text-red-500" /> {x}</li>)}</ul></section>
          </div>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {p.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-40 w-full rounded-2xl object-cover" />
            ))}
          </section>
          <section className="card p-6 text-sm text-slate-600">
            <h2 className="mb-2 text-lg font-extrabold text-slate-900">Cancellation policy</h2>
            <p>30+ days before travel: 90% refund · 15–29 days: 50% · 7–14 days: 25% · less than 7 days: no refund.</p>
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <p className="text-sm text-slate-500">{p.originalPrice && <span className="mr-2 line-through">{inr(p.originalPrice)}</span>}Starting from</p>
            <p className="text-3xl font-extrabold">{inr(p.price)} <span className="text-sm font-semibold text-slate-500">/adult</span></p>
            <HolidayBook pkgId={p.id} price={p.price} minDate={addDays(todayIST(), 3)} />
          </div>
          <EnquiryForm packageId={p.id} subject={`Enquiry: ${p.title}`} />
        </aside>
      </div>
    </div>
  );
}
