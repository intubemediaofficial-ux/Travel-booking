import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { RESOLVERS, BookErr, type Resolved } from "@/lib/resolve";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Empty } from "@/components/ui";
import type { Svc } from "@/lib/pricing";

export const metadata = { title: "Review & book" };

const MAP: Record<string, Svc> = { flight: "FLIGHT", hotel: "HOTEL", holiday: "HOLIDAY", train: "TRAIN", bus: "BUS", cab: "CAB" };

export default async function Page({ params, searchParams }: { params: Promise<{ svc: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ svc: s }, sp] = await Promise.all([params, searchParams]);
  const svc = MAP[s];
  if (!svc) notFound();
  const user = await requireUser(`/book/${s}?${new URLSearchParams(sp).toString()}`);
  let r: Resolved;
  try {
    r = await RESOLVERS[svc](sp);
  } catch (e) {
    if (!(e instanceof BookErr)) throw e;
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Empty title="This option is no longer available" text={e.message}>
          <Link href={`/${s === "bus" ? "buses" : s === "holiday" ? "holidays" : s + "s"}`} className="btn-primary">Search again</Link>
        </Empty>
      </div>
    );
  }
  const now = new Date();
  const [coupons, saved] = await Promise.all([
    prisma.coupon.findMany({ where: { active: true, appliesTo: { in: ["ALL", svc] }, minAmount: { lte: r.base }, OR: [{ validTill: null }, { validTill: { gt: now } }] }, take: 4 }),
    prisma.savedTraveller.findMany({ where: { userId: user.id }, take: 10 }),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Review your booking</h1>
      <section className="card mt-4 mb-6 flex flex-col gap-4 overflow-hidden md:flex-row">
        {r.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image} alt="" className="h-40 w-full object-cover md:h-auto md:w-56" />
        )}
        <div className="flex-1 p-5">
          <p className="text-xl font-extrabold text-brand-900">{r.title}</p>
          <p className="text-sm text-slate-500">{r.subtitle}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {r.summary.map(([k, v]) => (
              <div key={k}><dt className="text-xs font-bold uppercase text-slate-400">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
        </div>
      </section>
      <CheckoutForm
        svc={svc} base={r.base} pax={r.pax} nightly={r.nightly} travellers={r.travellers} mode={r.mode} berth={r.berth} params={sp}
        wallet={user.walletBalance} contact={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
        coupons={coupons.map((c) => ({ code: c.code, title: c.title }))} saved={saved.map((t) => ({ name: t.name, age: t.age, gender: t.gender }))}
        pickup={svc === "CAB"}
      />
    </div>
  );
}
