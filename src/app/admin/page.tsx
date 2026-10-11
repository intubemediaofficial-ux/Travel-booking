import Link from "next/link";
import { IndianRupee, Ticket, Users, XCircle, Clock, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";
import { AdminTitle, STATUS_BADGE } from "./AdminUI";
import { expireStaleHolds } from "@/lib/booking";

export const dynamic = "force-dynamic";

function startOfWindow(days: number) {
  const d = new Date(Date.now() - (days - 1) * 864e5);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function Dashboard() {
  const since = startOfWindow(30);
  await expireStaleHolds();
  const [paid, counts, users, enquiries, byType, recent, last30] = await Promise.all([
    prisma.booking.aggregate({ where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { total: true, walletUsed: true, refundAmount: true } }),
    prisma.booking.groupBy({ by: ["status"], _count: true }),
    prisma.user.count(),
    prisma.enquiry.count({ where: { status: "NEW" } }),
    prisma.booking.groupBy({ by: ["type"], where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { total: true }, _count: true }),
    prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
    prisma.booking.findMany({ where: { createdAt: { gte: since }, status: { in: ["CONFIRMED", "COMPLETED"] } }, select: { createdAt: true, total: true } }),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x._count])) as Record<string, number>;
  const revenue = (paid._sum.total ?? 0) + (paid._sum.walletUsed ?? 0) - (paid._sum.refundAmount ?? 0);
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(since.getTime() + i * 864e5); return { key: d.toDateString(), label: d.getDate(), v: 0 }; });
  for (const b of last30) { const d = days.find((x) => x.key === b.createdAt.toDateString()); if (d) d.v += b.total; }
  const max = Math.max(1, ...days.map((d) => d.v));
  const typeMax = Math.max(1, ...byType.map((t) => t._sum.total ?? 0));
  const stats = [
    ["Net revenue", inr(revenue), IndianRupee, "text-emerald-600 bg-emerald-50"],
    ["Confirmed", (c.CONFIRMED ?? 0) + (c.COMPLETED ?? 0), Ticket, "text-brand-600 bg-brand-50"],
    ["Pending payment", c.PENDING_PAYMENT ?? 0, Clock, "text-amber-600 bg-amber-50"],
    ["Cancelled", c.CANCELLED ?? 0, XCircle, "text-red-600 bg-red-50"],
    ["Users", users, Users, "text-violet-600 bg-violet-50"],
    ["New enquiries", enquiries, MessageSquare, "text-sky-600 bg-sky-50"],
  ] as const;
  return (
    <>
      <AdminTitle title="Dashboard" subtitle="Overview of bookings, revenue and customers" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" data-testid="admin-stats">
        {stats.map(([l, v, I, cls]) => (
          <div key={l} className="card p-4"><div className={`mb-3 inline-flex rounded-xl p-2 ${cls}`}><I className="h-5 w-5" /></div><p className="text-xs font-bold uppercase text-slate-500">{l}</p><p className="text-xl font-bold">{v}</p></div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-bold">Bookings value — last 30 days</h2>
          <div className="flex h-48 items-end gap-1">
            {days.map((d) => (
              <div key={d.key} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${d.key}: ${inr(d.v)}`}>
                <div className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${(d.v / max) * 100}%`, minHeight: d.v ? 4 : 1 }} />
                <span className="text-[9px] text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-bold">Revenue by service</h2>
          {byType.length === 0 && <p className="text-sm text-slate-500">No confirmed bookings yet.</p>}
          <div className="space-y-3">
            {byType.map((t) => (
              <div key={t.type}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{t.type} <span className="text-slate-400">({t._count})</span></span><span>{inr(t._sum.total ?? 0)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-accent-500" style={{ width: `${((t._sum.total ?? 0) / typeMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card mt-6 overflow-x-auto">
        <div className="flex items-center justify-between p-5"><h2 className="font-bold">Recent bookings</h2><Link href="/admin/bookings" className="text-sm font-bold text-brand-600">View all</Link></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Ref</th><th className="p-3">Customer</th><th className="p-3">Trip</th><th className="p-3">Date</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {recent.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="p-3 font-mono font-bold text-brand-700"><Link href={`/admin/bookings/${b.ref}`}>{b.ref}</Link></td>
                <td className="p-3">{b.user.name}</td><td className="p-3">{b.title}</td><td className="p-3">{fmtDate(b.travelDate)}</td><td className="p-3 font-semibold">{inr(b.total)}</td>
                <td className="p-3"><span className={STATUS_BADGE[b.status]}>{b.status.replace("_", " ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
