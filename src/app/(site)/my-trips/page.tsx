import Link from "next/link";
import { Plane, Hotel, Palmtree, TrainFront, Bus, Car } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completePastBookings, expireStaleHolds } from "@/lib/booking";
import { Empty } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { SVC_LABEL, type Svc } from "@/lib/pricing";

export const metadata = { title: "My Trips" };
export const ICON = { FLIGHT: Plane, HOTEL: Hotel, HOLIDAY: Palmtree, TRAIN: TrainFront, BUS: Bus, CAB: Car };
export const STATUS: Record<string, [string, string]> = {
  CONFIRMED: ["Confirmed", "badge-green"], PENDING_PAYMENT: ["Payment pending", "badge-amber"], CANCELLED: ["Cancelled", "badge-red"], COMPLETED: ["Completed", "badge-slate"],
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "upcoming" } = await searchParams;
  const user = await requireUser("/my-trips");
  await Promise.all([completePastBookings(user.id), expireStaleHolds(user.id)]);
  const where =
    tab === "cancelled" ? { status: "CANCELLED" as const } : tab === "completed" ? { status: "COMPLETED" as const } : tab === "pending" ? { status: "PENDING_PAYMENT" as const } : { status: "CONFIRMED" as const };
  const [list, counts] = await Promise.all([
    prisma.booking.findMany({ where: { userId: user.id, ...where }, orderBy: tab === "upcoming" ? { travelDate: "asc" } : { createdAt: "desc" } }),
    prisma.booking.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x._count]));
  const tabs: [string, string, number][] = [["upcoming", "Upcoming", c.CONFIRMED ?? 0], ["pending", "Payment pending", c.PENDING_PAYMENT ?? 0], ["completed", "Completed", c.COMPLETED ?? 0], ["cancelled", "Cancelled", c.CANCELLED ?? 0]];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">My Trips</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto border-b">
        {tabs.map(([k, l, n]) => (
          <Link key={k} href={`/my-trips?tab=${k}`} className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-bold ${tab === k ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500"}`}>{l} ({n})</Link>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <Empty title={`No ${tabs.find((t) => t[0] === tab)?.[1].toLowerCase()} trips`} text="Plan your next getaway now!"><Link href="/" className="btn-primary">Book a trip</Link></Empty>
        ) : list.map((b) => {
          const I = ICON[b.type];
          const [label, cls] = STATUS[b.status];
          return (
            <Link key={b.id} href={b.status === "PENDING_PAYMENT" ? `/pay/${b.ref}` : `/my-trips/${b.ref}`} className="card flex items-center gap-4 p-4 transition hover:shadow-lg" data-testid="trip-row">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><I className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{b.title}</p>
                <p className="truncate text-xs text-slate-500">{b.subtitle}</p>
                <p className="mt-1 text-xs text-slate-500">{SVC_LABEL[b.type as Svc]} · {b.ref} · {fmtDateTime(b.travelDate)}</p>
              </div>
              <div className="text-right">
                <span className={`${cls}`}>{label}</span>
                <p className="mt-1 font-bold">₹{(b.total + b.walletUsed).toLocaleString("en-IN")}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
