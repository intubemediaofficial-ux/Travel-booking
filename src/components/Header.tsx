import Link from "next/link";
import { Plane, Hotel, Palmtree, TrainFront, Bus, CarTaxiFront, BadgePercent, Briefcase, User, Wallet, Heart, LogOut, Shield } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { logoutAction } from "@/app/actions/auth";

export const SERVICES = [
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/hotels", label: "Hotels", icon: Hotel },
  { href: "/holidays", label: "Holidays", icon: Palmtree },
  { href: "/trains", label: "Trains", icon: TrainFront },
  { href: "/buses", label: "Buses", icon: Bus },
  { href: "/cabs", label: "Cabs", icon: CarTaxiFront },
];

export async function Header() {
  const [user, s] = await Promise.all([getUser(), getSettings()]);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Logo name={s.siteName} />
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {SERVICES.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700">
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <Link href="/offers" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-accent-600 hover:bg-orange-50">
            <BadgePercent className="h-4 w-4" /> Offers
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/my-trips" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:flex">
            <Briefcase className="h-4 w-4" /> My Trips
          </Link>
          {user ? (
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate sm:inline">Hi, {user.name.split(" ")[0]}</span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-2 shadow-xl ring-1 ring-slate-200">
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-600 hover:bg-slate-50"><Shield className="h-4 w-4" /> Admin panel</Link>
                )}
                <Link href="/my-trips" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><Briefcase className="h-4 w-4" /> My Trips</Link>
                <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><User className="h-4 w-4" /> My Profile</Link>
                <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><Wallet className="h-4 w-4" /> Wallet <span className="ml-auto text-xs font-bold text-emerald-600">₹{user.walletBalance.toLocaleString("en-IN")}</span></Link>
                <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><Heart className="h-4 w-4" /> Wishlist</Link>
                <form action={logoutAction}>
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Logout</button>
                </form>
              </div>
            </details>
          ) : (
            <Link href="/login" className="btn-primary">Login / Sign up</Link>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-1.5 lg:hidden">
        {[...SERVICES, { href: "/offers", label: "Offers", icon: BadgePercent }].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-brand-50">
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
