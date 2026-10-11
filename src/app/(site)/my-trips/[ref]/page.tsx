import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundFor, SVC_LABEL, type Svc } from "@/lib/pricing";
import { fmtDateTime, fmtDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { CancelBox } from "@/components/CancelBox";
import { PrintButton } from "@/components/PrintButton";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Booking details" };

type Leg = { airline: string; flightNo: string; date: string; dep: string; arr: string; fromName: string; toName: string; from: string; to: string; fromAirport?: string; toAirport?: string; baggage: string };

export default async function Page({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ paid?: string; cancelled?: string }> }) {
  const [{ ref }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/my-trips/${ref}`);
  const b = await prisma.booking.findUnique({ where: { ref } });
  if (!b || (b.userId !== user.id && user.role !== "ADMIN")) notFound();
  const s = await getSettings();
  const d = b.details as Record<string, unknown>;
  const travellers = (b.travellers as { name: string; age: number; gender: string; berth?: string }[]) ?? [];
  const r = b.status === "CONFIRMED" ? refundFor({ ...b, type: b.type as Svc }) : null;
  const paid = b.total + b.walletUsed;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {sp.paid && b.status === "CONFIRMED" && (
        <div className="no-print mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-800" data-testid="booking-confirmed">
          <CheckCircle2 className="h-8 w-8" /><div><p className="text-lg font-bold">Booking confirmed!</p><p className="text-sm">E-ticket sent to {b.contactEmail}. Have a great trip.</p></div>
        </div>
      )}
      {sp.cancelled && b.status === "CANCELLED" && (
        <div className="no-print mb-5 flex items-center gap-3 rounded-2xl bg-amber-50 p-5 text-amber-800" data-testid="booking-cancelled">
          <XCircle className="h-8 w-8" /><div><p className="text-lg font-bold">Booking cancelled</p><p className="text-sm">{b.refundAmount ? `Refund of ₹${b.refundAmount.toLocaleString("en-IN")} ${b.refundTo === "WALLET" ? "credited to your wallet" : "initiated to source (5–7 working days)"}.` : "No refund applicable."}</p></div>
        </div>
      )}
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/my-trips" className="text-sm font-bold text-brand-600">← My Trips</Link>
        {b.status !== "PENDING_PAYMENT" && <PrintButton />}
      </div>
      <article className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-white p-1.5"><Logo name={s.siteName} /></div><div><p className="text-xs uppercase tracking-wider text-white/70">{SVC_LABEL[b.type as Svc]} e-ticket</p><p className="text-lg font-bold">{s.siteName}</p></div></div>
          <div className="text-right">
            <p className="text-xs text-white/70">Booking ID</p><p className="font-mono text-lg font-bold" data-testid="booking-ref">{b.ref}</p>
            {b.pnr && <p className="text-xs">PNR: <b className="font-mono" data-testid="pnr">{b.pnr}</b></p>}
          </div>
        </header>
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h1 className="text-2xl font-bold">{b.title}</h1><p className="text-sm text-slate-500">{b.subtitle}</p></div>
            <span className={`${b.status === "CONFIRMED" ? "badge-green" : b.status === "CANCELLED" ? "badge-red" : b.status === "COMPLETED" ? "badge-slate" : "badge-amber"}`} data-testid="status">{b.status.replace("_", " ")}</span>
          </div>

          {b.type === "FLIGHT" && ((d.legs as Leg[]) ?? []).map((l, i) => (
            <div key={i} className="rounded-2xl border p-4">
              <p className="mb-2 text-xs font-bold uppercase text-slate-400">{i ? "Return" : "Onward"} · {l.airline} {l.flightNo} · {fmtDate(l.date, { weekday: "short" })}</p>
              <div className="flex items-center justify-between">
                <div><p className="text-2xl font-bold">{l.dep}</p><p className="text-sm font-bold">{l.fromName} ({l.from})</p><p className="text-xs text-slate-500">{l.fromAirport}</p></div>
                <span className="text-xs text-slate-400">✈</span>
                <div className="text-right"><p className="text-2xl font-bold">{l.arr}</p><p className="text-sm font-bold">{l.toName} ({l.to})</p><p className="text-xs text-slate-500">{l.toAirport}</p></div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Baggage: {l.baggage} · Cabin: {String(d.cabin)}</p>
            </div>
          ))}
          {b.type === "HOTEL" && (
            <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-3">
              <div><p className="text-xs font-bold uppercase text-slate-400">Check-in</p><p className="font-bold">{fmtDate(String(d.checkIn), { weekday: "short" })}</p><p className="text-xs">from {String(d.checkInTime)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Check-out</p><p className="font-bold">{fmtDate(String(d.checkOut), { weekday: "short" })}</p><p className="text-xs">by {String(d.checkOutTime)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Room</p><p className="font-bold">{String(d.room)} × {String(d.rooms)}</p><p className="text-xs">{String(d.guests)} guests · {d.breakfast ? "Breakfast incl." : "Room only"}</p></div>
              <p className="text-sm text-slate-600 sm:col-span-3">{String(d.address)}</p>
            </div>
          )}
          {b.type === "TRAIN" && (
            <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-4">
              <div><p className="text-xs font-bold uppercase text-slate-400">From</p><p className="font-bold">{String(d.from)}</p><p className="text-xs">{fmtDateTime(b.travelDate)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">To</p><p className="font-bold">{String(d.to)}</p><p className="text-xs">Arr {String(d.arr)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Class</p><p className="font-bold">{String(d.className)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Coach</p><p className="font-bold">{String(d.coach)}</p></div>
            </div>
          )}
          {b.type === "BUS" && (
            <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-3">
              <div><p className="text-xs font-bold uppercase text-slate-400">Boarding</p><p className="font-bold">{String(d.boarding)}</p><p className="text-xs">{fmtDateTime(b.travelDate)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Dropping</p><p className="font-bold">{String(d.dropping)}</p><p className="text-xs">Arr {String(d.arr)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Seats</p><p className="font-bold">{b.seats.join(", ")}</p></div>
            </div>
          )}
          {b.type === "CAB" && (
            <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-3">
              <div><p className="text-xs font-bold uppercase text-slate-400">Pickup</p><p className="font-bold">{fmtDateTime(b.travelDate)}</p><p className="text-xs">{String(d.pickup ?? d.from)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Car</p><p className="font-bold">{String(d.cab)}</p><p className="text-xs">{String(d.models)}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Distance</p><p className="font-bold">{String(d.km)} km</p><p className="text-xs">Driver details shared 2 hrs before pickup</p></div>
            </div>
          )}
          {b.type === "HOLIDAY" && (
            <div className="rounded-2xl border p-4 text-sm">
              <p><b>Start:</b> {fmtDateTime(b.travelDate)} · <b>End:</b> {b.endDate && fmtDate(b.endDate)}</p>
              <p className="mt-1 text-slate-600">Our holiday expert will call you within 24 hrs to share vouchers & itinerary.</p>
            </div>
          )}

          <section>
            <h2 className="mb-2 font-bold">{b.type === "HOTEL" || b.type === "CAB" ? "Guest" : "Travellers"}</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="py-1">#</th><th>Name</th>{b.type !== "HOTEL" && b.type !== "CAB" && <><th>Age</th><th>Gender</th></>}{b.type === "BUS" && <th>Seat</th>}{b.type === "TRAIN" && <th>Berth</th>}</tr></thead>
              <tbody>
                {travellers.map((t, i) => (
                  <tr key={i} className="border-t"><td className="py-2">{i + 1}</td><td className="font-semibold">{t.name}</td>{b.type !== "HOTEL" && b.type !== "CAB" && <><td>{t.age}</td><td>{t.gender}</td></>}{b.type === "BUS" && <td>{b.seats[i]}</td>}{b.type === "TRAIN" && <td>{b.status === "CANCELLED" ? "CAN" : `CNF/${String(d.coach)}/${10 + i * 3}${t.berth && t.berth !== "No preference" ? ` (${t.berth})` : ""}`}</td>}</tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">Contact: {b.contactName} · {b.contactEmail} · {b.contactPhone}</p>
          </section>

          <section className="rounded-2xl bg-slate-50 p-4 text-sm">
            <h2 className="mb-2 font-bold">Payment</h2>
            <div className="grid gap-1 sm:grid-cols-2">
              <p className="flex justify-between sm:block">Base fare: <b>₹{b.baseAmount.toLocaleString("en-IN")}</b></p>
              <p className="flex justify-between sm:block">Taxes & fees: <b>₹{(b.taxes + b.fee).toLocaleString("en-IN")}</b></p>
              {b.discount > 0 && <p className="flex justify-between text-emerald-700 sm:block">Discount ({b.couponCode}): <b>− ₹{b.discount.toLocaleString("en-IN")}</b></p>}
              {b.walletUsed > 0 && <p className="flex justify-between sm:block">Paid from wallet: <b>₹{b.walletUsed.toLocaleString("en-IN")}</b></p>}
              <p className="flex justify-between text-base sm:block">Total paid: <b>₹{paid.toLocaleString("en-IN")}</b></p>
              <p className="flex justify-between sm:block">Method: <b>{b.paymentMethod ?? "—"}</b>{b.paidAt && ` · ${fmtDateTime(b.paidAt)}`}</p>
              {b.status === "CANCELLED" && <p className="flex justify-between text-amber-700 sm:col-span-2 sm:block">Refund: <b data-testid="refund">₹{b.refundAmount.toLocaleString("en-IN")}</b> {b.refundTo && `→ ${b.refundTo.toLowerCase()}`} · Cancelled {b.cancelledAt && fmtDateTime(b.cancelledAt)} ({b.cancelReason})</p>}
            </div>
          </section>
          <p className="text-xs text-slate-400">Booked on {fmtDateTime(b.createdAt)} · Support: {s.supportPhone} · {s.supportEmail}</p>
        </div>
      </article>
      {b.status === "PENDING_PAYMENT" && <Link href={`/pay/${b.ref}`} className="btn-accent no-print mt-5 w-full py-4">Complete payment</Link>}
      {r && b.userId === user.id && <CancelBox ref_={b.ref} allowed={r.allowed} refund={r.refund} note={r.note} paid={paid} />}
    </div>
  );
}
