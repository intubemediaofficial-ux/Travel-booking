import { Star } from "lucide-react";

export function Stars({ n, className = "h-3.5 w-3.5" }: { n: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${n} star`}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className={`${className} fill-amber-400 text-amber-400`} />
      ))}
    </span>
  );
}

export function Rating({ v, count }: { v: number; count?: number }) {
  const label = v >= 4.5 ? "Excellent" : v >= 4 ? "Very Good" : v >= 3.5 ? "Good" : "Average";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-md rounded-bl-none bg-brand-800 px-1.5 py-0.5 text-xs font-semibold text-accent-400">{v.toFixed(1)}</span>
      <span className="text-xs font-semibold text-brand-800">{label}</span>
      {count != null && <span className="text-xs text-slate-500">({count.toLocaleString("en-IN")} ratings)</span>}
    </span>
  );
}

export function SearchBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-print pattern-dots border-b-4 border-accent-500 bg-brand-900 pb-6 pt-5">
      <div className="mx-auto max-w-7xl px-4">{children}</div>
    </div>
  );
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/hero.jpg" alt="" className="mb-5 h-28 w-44 rounded-xl object-cover opacity-80 grayscale" />
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, subtitle, image = "/img/hero2.jpg" }: { title: string; subtitle?: string; image?: string }) {
  return (
    <div className="relative overflow-hidden bg-brand-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-60 md:w-1/2 md:[mask-image:linear-gradient(to_right,transparent,black_40%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/80 to-transparent md:hidden" />
      <div className="relative mx-auto max-w-7xl px-4 py-9 text-white md:py-14">
        <p className="eyebrow text-accent-400">Intube Trip</p>
        <h1 className="mt-2 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-white/75">{subtitle}</p>}
      </div>
    </div>
  );
}
