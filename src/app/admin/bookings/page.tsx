import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";
import { AdminTitle, Pager, STATUS_BADGE } from "../AdminUI";

export const dynamic = "force-dynamic";
const PER = 25;
const TYPES = ["FLIGHT", "HOTEL", "HOLIDAY", "TRAIN", "BUS", "CAB"] as const;
const STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export default async function Bookings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.BookingWhereInput = {};
  if (sp.type && (TYPES as readonly string[]).includes(sp.type)) where.type = sp.type as (typeof TYPES)[number];
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status as (typeof STATUSES)[number];
  if (sp.q) where.OR = [{ ref: { contains: sp.q, mode: "insensitive" } }, { pnr: { contains: sp.q, mode: "insensitive" } }, { contactEmail: { contains: sp.q, mode: "insensitive" } }, { contactPhone: { contains: sp.q } }, { title: { contains: sp.q, mode: "insensitive" } }];
  const [rows, total, sum] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { user: true } }),
    prisma.booking.count({ where }),
    prisma.booking.aggregate({ where, _sum: { total: true } }),
  ]);
  const qs = new URLSearchParams(Object.entries({ q: sp.q, type: sp.type, status: sp.status }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <AdminTitle title="Bookings" subtitle={`${total} bookings · ${inr(sum._sum.total ?? 0)} total value`} />
      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-[1fr_180px_200px_auto]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={sp.q} placeholder="Ref, PNR, email, phone, title…" className="input pl-9" /></div>
        <select name="type" defaultValue={sp.type ?? ""} className="input"><option value="">All services</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">All statuses</option>{STATUSES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
        <button className="btn-primary">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="bookings-table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Ref</th><th className="p-3">Service</th><th className="p-3">Customer</th><th className="p-3">Trip</th><th className="p-3">Travel</th><th className="p-3">Booked</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-brand-700"><Link href={`/admin/bookings/${b.ref}`}>{b.ref}</Link></td>
                <td className="p-3">{b.type}</td>
                <td className="p-3"><p className="font-semibold">{b.user.name}</p><p className="text-xs text-slate-500">{b.contactPhone}</p></td>
                <td className="max-w-xs truncate p-3">{b.title}</td>
                <td className="whitespace-nowrap p-3">{fmtDate(b.travelDate)}</td>
                <td className="whitespace-nowrap p-3">{fmtDate(b.createdAt)}</td>
                <td className="p-3 font-semibold">{inr(b.total)}</td>
                <td className="p-3 text-xs">{b.paymentStatus}</td>
                <td className="p-3"><span className={STATUS_BADGE[b.status]}>{b.status.replace("_", " ")}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">No bookings found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/bookings${qs ? `?${qs}` : ""}`} />
    </>
  );
}
