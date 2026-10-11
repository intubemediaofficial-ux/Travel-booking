"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin, Plane, TrainFront } from "lucide-react";
import type { CityOpt } from "@/lib/cities";

export function CityInput({
  label,
  name,
  value,
  onChange,
  cities,
  mode = "city",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (code: string) => void;
  cities: CityOpt[];
  mode?: "air" | "rail" | "city";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const cur = cities.find((c) => c.code === value);
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return cities.filter((c) =>
      !s || c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || c.state.toLowerCase().includes(s),
    );
  }, [cities, q]);
  const sub = (c: CityOpt) => (mode === "air" ? c.airport : mode === "rail" ? c.station : `${c.state}, ${c.country}`) ?? c.state;
  const Icon = mode === "air" ? Plane : mode === "rail" ? TrainFront : MapPin;
  return (
    <div
      ref={ref}
      className="relative"
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-400"
        data-testid={`city-${name}`}
      >
        <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="block truncate text-xl font-extrabold text-slate-900">{cur?.name ?? "Select city"}</span>
        <span className="block truncate text-xs text-slate-500">{cur ? `${cur.code}, ${sub(cur)}` : "Tap to choose"}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
          <input
            autoFocus
            className="w-full border-b border-slate-200 px-4 py-3 text-sm outline-none"
            placeholder="Type a city"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={`${label} search`}
          />
          <ul className="max-h-72 overflow-y-auto py-1">
            {list.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-brand-50"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{c.name}{c.country !== "India" ? `, ${c.country}` : ""}</span>
                    <span className="block truncate text-xs text-slate-500">{sub(c)}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-400">{c.code}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-4 py-3 text-sm text-slate-500">No city found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
