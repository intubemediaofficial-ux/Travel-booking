"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plane, Hotel, Briefcase, User, MessageCircle } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/hotels", label: "Hotels", icon: Hotel },
  { href: "/my-trips", label: "My Trips", icon: Briefcase },
  { href: "/account", label: "Account", icon: User },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sand-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden" aria-label="Mobile">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? "text-brand-700" : "text-slate-500"}`}>
            <span className={`grid h-7 w-12 place-items-center rounded-full ${on ? "bg-brand-100" : ""}`}><Icon className="h-[18px] w-[18px]" /></span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function WhatsAppFab({ number }: { number: string }) {
  if (!number) return null;
  const text = encodeURIComponent("Hi, I need help with a booking on Intube Trip");
  return (
    <a
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="no-print fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 lg:bottom-6"
    >
      <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Book on WhatsApp</span>
    </a>
  );
}
