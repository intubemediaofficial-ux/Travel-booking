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
      <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-xs font-extrabold text-white">{v.toFixed(1)}</span>
      <span className="text-xs font-bold text-brand-700">{label}</span>
      {count != null && <span className="text-xs text-slate-500">({count.toLocaleString("en-IN")} ratings)</span>}
    </span>
  );
}

export function SearchBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-print bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 pb-6 pt-4">
      <div className="mx-auto max-w-7xl px-4">{children}</div>
    </div>
  );
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/hero.jpg" alt="" className="mb-5 h-28 w-44 rounded-2xl object-cover opacity-80" />
      <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, subtitle, image = "/img/hero2.jpg" }: { title: string; subtitle?: string; image?: string }) {
  return (
    <div className="relative overflow-hidden bg-brand-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 text-white">
        <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-white/80">{subtitle}</p>}
      </div>
    </div>
  );
}
