import { prisma } from "@/lib/db";
import { PageTitle, Empty } from "@/components/ui";
import { CopyCode } from "@/components/CopyCode";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Offers & coupons" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const now = new Date();
  const offers = await prisma.coupon.findMany({ where: { active: true, showAsOffer: true, OR: [{ validTill: null }, { validTill: { gt: now } }] }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageTitle title="Offers & coupons" subtitle="Grab the best deals on flights, hotels, holidays, trains, buses and cabs." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {offers.length === 0 ? <Empty title="No active offers right now" /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <div key={o.id} className="card flex flex-col overflow-hidden" data-testid="offer-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.image ?? "/img/hero2.jpg"} alt="" className="h-40 w-full object-cover" />
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent-600">{o.appliesTo === "ALL" ? "All bookings" : o.appliesTo}</span>
                  <h2 className="mt-1 text-lg font-extrabold">{o.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-slate-600">{o.description}</p>
                  <p className="mt-2 text-xs text-slate-500">{o.kind === "PERCENT" ? `${o.value}% off${o.maxDiscount ? ` up to ₹${o.maxDiscount.toLocaleString("en-IN")}` : ""}` : `Flat ₹${o.value.toLocaleString("en-IN")} off`}{o.minAmount ? ` · Min booking ₹${o.minAmount.toLocaleString("en-IN")}` : ""}{o.validTill ? ` · Valid till ${fmtDate(o.validTill)}` : ""}</p>
                  <div className="mt-3"><CopyCode code={o.code} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
