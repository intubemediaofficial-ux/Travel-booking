import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { busFare, busLayout, runsOn, takenSeats } from "@/lib/inventory";
import { addTime, duration, fmtDate, todayIST } from "@/lib/format";
import { SeatPicker } from "@/components/SeatPicker";
import { Empty } from "@/components/ui";

export const metadata = { title: "Select seats" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string }> }) {
  const [{ id }, { date }] = await Promise.all([params, searchParams]);
  const b = await prisma.bus.findUnique({ where: { id }, include: { fromCity: true, toCity: true } });
  if (!b || !b.active) notFound();
  if (!date || date < todayIST() || !runsOn(b.days, date))
    return <div className="mx-auto max-w-3xl px-4 py-12"><Empty title="Bus not running on this date" text="Please search again."><Link href="/buses" className="btn-primary">Search buses</Link></Empty></div>;
  const taken = await takenSeats(b.id, date);
  const arr = addTime(b.departTime, b.durationMins);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/buses?from=${b.fromCity.code}&to=${b.toCity.code}&date=${date}`} className="text-sm font-bold text-brand-600">← Back to results</Link>
      <div className="card mt-3 flex flex-wrap items-center justify-between gap-4 p-5">
        <div><p className="text-xl font-extrabold">{b.operator}</p><p className="text-sm text-slate-500">{b.busType} · {b.fromCity.name} → {b.toCity.name}</p></div>
        <p className="text-sm font-semibold">{fmtDate(date, { weekday: "short" })} · {b.departTime} → {arr.time}{arr.days ? " (+1)" : ""} · {duration(b.durationMins)}</p>
      </div>
      <SeatPicker busId={b.id} date={date} layout={busLayout(b.sleeper, b.seats)} taken={taken} fare={busFare(b, date)} boarding={b.boarding} dropping={b.dropping} />
    </div>
  );
}
