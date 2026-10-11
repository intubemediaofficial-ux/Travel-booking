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
    <form ref={ref} onChange={apply} onSubmit={(e) => { e.preventDefault(); apply(); }} className="space-y-5">
      {children}
    </form>
  );
}

export function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-extrabold text-slate-800">{title}</legend>
      <div className="space-y-1.5">{children}</div>
    </fieldset>
  );
}

export function Check({ name, value, label, checked, extra }: { name: string; value: string; label: string; checked: boolean; extra?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4 accent-brand-600" />
      <span className="flex-1">{label}</span>
      {extra && <span className="text-xs text-slate-500">{extra}</span>}
    </label>
  );
}
