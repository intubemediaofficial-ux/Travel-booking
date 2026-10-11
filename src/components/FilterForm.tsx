"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";

export function FilterForm({ children, keep }: { children: React.ReactNode; keep: Record<string, string | undefined> }) {
  const router = useRouter();
  const path = usePathname();
  const ref = useRef<HTMLFormElement>(null);
  const apply = () => {
    const fd = new FormData(ref.current!);
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    for (const [k, v] of fd.entries()) if (v) q.append(k, String(v));
    router.push(`${path}?${q.toString()}`, { scroll: false });
  };
  return (
    <form ref={ref} onChange={apply} onSubmit={(e) => { e.preventDefault(); apply(); }} className="divide-y divide-sand-200 [&>fieldset]:py-4 [&>fieldset:first-child]:pt-0">
      {children}
    </form>
  );
}

export function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="float-left mb-2.5 w-full text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700/80">{title}</legend>
      <div className="clear-both flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export function Check({ name, value, label, checked, extra }: { name: string; value: string; label: string; checked: boolean; extra?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sand-200 bg-sand-50 px-2.5 py-1.5 text-[13px] text-slate-700 transition hover:border-brand-400 has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="sr-only" />
      <span>{label}</span>
      {extra && <span className="text-[11px] opacity-70">{extra}</span>}
    </label>
  );
}
