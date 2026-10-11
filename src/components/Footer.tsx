import Link from "next/link";
import { Mail, Phone, MapPin, ShieldCheck, Headphones, BadgeIndianRupee } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Logo } from "./Logo";

export async function Footer() {
  const s = await getSettings();
  const socials = [
    ["Facebook", s.facebook],
    ["Instagram", s.instagram],
    ["Twitter / X", s.twitter],
    ["YouTube", s.youtube],
  ].filter(([, v]) => v);
  return (
    <footer className="no-print pattern-dots mt-16 border-t-4 border-accent-500 bg-brand-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-6 border-b border-white/10 px-4 py-8 sm:grid-cols-3">
        {[
          [ShieldCheck, "Secure payments", "100% safe & encrypted checkout"],
          [BadgeIndianRupee, "Best price promise", "Lowest fares with exclusive coupons"],
          [Headphones, "24×7 support", "We are here for every step of your trip"],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <div key={t as string} className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-accent-500/40"><I className="h-5 w-5 text-accent-400" /></span>
              <div><p className="font-bold text-white">{t as string}</p><p className="text-sm">{d as string}</p></div>
            </div>
          );
        })}
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo name={s.siteName} light />
          <p className="mt-3 max-w-sm text-sm">{s.heroSubtitle}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {s.supportPhone}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {s.supportEmail}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {s.address}</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-400">Book</p>
          <ul className="space-y-2 text-sm">
            {["flights", "hotels", "holidays", "trains", "buses", "cabs"].map((x) => (
              <li key={x}><Link className="capitalize hover:text-white" href={`/${x}`}>{x}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-400">Your account</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/my-trips">My Trips</Link></li>
            <li><Link className="hover:text-white" href="/wallet">Wallet</Link></li>
            <li><Link className="hover:text-white" href="/trains/pnr">PNR status</Link></li>
            <li><Link className="hover:text-white" href="/offers">Offers & coupons</Link></li>
            <li><Link className="hover:text-white" href="/wishlist">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-400">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/about">About us</Link></li>
            <li><Link className="hover:text-white" href="/support">Customer support</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms & conditions</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy policy</Link></li>
            {socials.map(([n, v]) => (
              <li key={n}><a className="hover:text-white" href={v} target="_blank" rel="noreferrer">{n}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} {s.siteName}. All rights reserved.</p>
    </footer>
  );
}
