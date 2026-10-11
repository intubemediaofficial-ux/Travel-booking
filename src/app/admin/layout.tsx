import Link from "next/link";
import { LayoutDashboard, Ticket, Users, Plane, Building2, BedDouble, Palmtree, TrainFront, Bus, Car, BadgePercent, MapPin, MessageSquare, Star, Settings, ExternalLink, PlaneTakeoff } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Admin" };

const NAV = [
  ["/admin", "Dashboard", LayoutDashboard], ["/admin/bookings", "Bookings", Ticket], ["/admin/users", "Users", Users],
  ["/admin/r/flights", "Flights", Plane], ["/admin/r/airlines", "Airlines", PlaneTakeoff], ["/admin/r/hotels", "Hotels", Building2], ["/admin/r/rooms", "Hotel rooms", BedDouble],
  ["/admin/r/packages", "Holidays", Palmtree], ["/admin/r/trains", "Trains", TrainFront], ["/admin/r/buses", "Buses", Bus], ["/admin/r/cabs", "Cabs", Car],
  ["/admin/r/coupons", "Coupons", BadgePercent], ["/admin/r/cities", "Cities", MapPin], ["/admin/r/enquiries", "Enquiries", MessageSquare], ["/admin/r/reviews", "Reviews", Star], ["/admin/settings", "Settings", Settings],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [u, s] = await Promise.all([requireAdmin(), getSettings()]);
  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-brand-900 text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center justify-between p-4"><Link href="/admin" className="rounded-xl bg-white px-2 py-1"><Logo name={s.siteName} /></Link></div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col">
          {NAV.map(([href, label, I]) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"><I className="h-4 w-4" /> {label}</Link>
          ))}
          <Link href="/" className="mt-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-accent-500 hover:bg-white/10"><ExternalLink className="h-4 w-4" /> View site</Link>
        </nav>
        <p className="hidden px-5 pb-5 text-xs text-white/50 lg:block">Signed in as {u.email}</p>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
