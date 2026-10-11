import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { refundFor } from "@/lib/pricing";
import type { Svc } from "@/lib/pricing";
import { OpForm } from "@/components/AdminForms";
import { adminBookingAction } from "@/app/actions/admin";
import { AdminTitle, STATUS_BADGE } from "../../AdminUI";

export const dynamic = "force-dynamic";

type Trav = { name?: string; age?: number | string; gender?: string; seat?: string; status?: string };

export default async function BookingAdmin({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const b = await prisma.booking.findUnique({ where: { ref }, include: { user: true } });
  if (!b) notFound();
  const travellers = (Array.isArray(b.travellers) ? b.travellers : []) as Trav[];
  const policy = b.status === "CONFIRMED" ? refundFor({ ...b, type: b.type as Svc }) : null;
  const rows: [string, React.ReactNode][] = [
    ["Status", <span key="s" className={STATUS_BADGE[b.status]}>{b.status.replace("_", " ")}</span>], ["Service", b.type], ["PNR", b.pnr ?? "—"],
    ["Travel date", fmtDate(b.travelDate)], ["End date", b.endDate ? fmtDate(b.endDate) : "—"], ["Booked on", fmtDateTime(b.createdAt)],
    ["Customer", <Link key="u" className="font-semibold text-brand-600" href={`/admin/users/${b.userId}`}>{b.user.name} ({b.user.email})</Link>],
    ["Contact", `${b.contactName} · ${b.contactEmail} · ${b.contactPhone}`], ["Seats", b.seats.join(", ") || "—"],
    ["Payment", `${b.paymentStatus}${b.paymentMethod ? ` · ${b.paymentMethod}` : ""}${b.paymentRef ? ` · ${b.paymentRef}` : ""}`],
  ];
  return (
    <div className="max-w-5xl">
      <Link href="/admin/bookings" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600"><ArrowLeft className="h-4 w-4" /> Bookings</Link>
      <AdminTitle title={`Booking ${b.ref}`} subtitle={`${b.title} — ${b.subtitle ?? ""}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="card divide-y divide-slate-100">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[140px_1fr] gap-3 p-3 text-sm"><span className="text-slate-500">{k}</span><span>{v}</span></div>)}</div>
          <div className="card overflow-x-auto">
            <h2 className="p-4 font-bold">Travellers</h2>
            <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">#</th><th className="p-3">Name</th><th className="p-3">Age</th><th className="p-3">Gender</th><th className="p-3">Seat/Status</th></tr></thead>
              <tbody>{travellers.map((t, i) => <tr key={i} className="border-t border-slate-100"><td className="p-3">{i + 1}</td><td className="p-3">{t.name}</td><td className="p-3">{t.age ?? "—"}</td><td className="p-3">{t.gender ?? "—"}</td><td className="p-3">{t.seat ?? t.status ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-bold">Fare</h2>
            {([["Base fare", b.baseAmount], ["Taxes", b.taxes], ["Convenience fee", b.fee], ["Discount", -b.discount], ["Wallet used", -b.walletUsed]] as const).map(([k, v]) => <div key={k} className="flex justify-between py-1"><span className="text-slate-500">{k}{k === "Discount" && b.couponCode ? ` (${b.couponCode})` : ""}</span><span>{inr(v)}</span></div>)}
            <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total paid</span><span>{inr(b.total)}</span></div>
            {b.refundAmount > 0 && <div className="flex justify-between pt-1 font-bold text-emerald-700"><span>Refunded ({b.refundTo})</span><span>{inr(b.refundAmount)}</span></div>}
            {b.cancelReason && <p className="mt-2 text-xs text-slate-500">Cancel reason: {b.cancelReason}</p>}
          </div>
        </div>
        <div className="space-y-4">
          {b.status === "PENDING_PAYMENT" && (
            <div className="card p-4"><h3 className="mb-2 font-bold">Mark as paid (offline)</h3>
              <OpForm action={adminBookingAction} hidden={{ ref: b.ref, op: "confirm" }} label="Confirm booking"><input name="paymentRef" placeholder="Payment reference / UTR" className="input" /></OpForm></div>
          )}
          {b.status === "CONFIRMED" && (
            <div className="card p-4"><h3 className="mb-2 font-bold">Mark trip completed</h3><OpForm action={adminBookingAction} hidden={{ ref: b.ref, op: "complete" }} label="Mark completed" /></div>
          )}
          {(b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT") && (
            <div className="card p-4">
              <h3 className="mb-1 font-bold text-red-700">Cancel booking</h3>
              {policy && <p className="mb-3 text-xs text-slate-500">Policy refund: <b>{inr(policy.refund)}</b> — {policy.note}</p>}
              <OpForm action={adminBookingAction} hidden={{ ref: b.ref, op: "cancel" }} label="Cancel & refund" danger confirm="Cancel this booking and process the refund?">
                {b.status === "CONFIRMED" && <><label className="label">Refund amount override (₹, optional)</label><input name="refund" type="number" min={0} max={b.total + b.walletUsed} className="input" placeholder={policy ? String(policy.refund) : ""} />
                  <label className="label mt-2">Refund to</label><select name="refundTo" className="input"><option value="WALLET">Wallet (instant)</option><option value="SOURCE">Original payment method</option></select></>}
                <input name="reason" className="input" placeholder="Reason" />
              </OpForm>
            </div>
          )}
          <div className="card p-4"><h3 className="mb-2 font-bold">Resend confirmation email</h3><OpForm action={adminBookingAction} hidden={{ ref: b.ref, op: "resend" }} label="Send email" /></div>
          <Link href={`/my-trips/${b.ref}`} className="btn-ghost w-full" target="_blank">Open customer e-ticket</Link>
        </div>
      </div>
    </div>
  );
}
