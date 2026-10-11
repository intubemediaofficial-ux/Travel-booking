"use client";

import Link from "next/link";
import { useState } from "react";

export function HolidayBook({ pkgId, price, minDate }: { pkgId: string; price: number; minDate: string }) {
  const [date, setDate] = useState(() => { const d = new Date(minDate); d.setDate(d.getDate() + 11); return d.toISOString().slice(0, 10); });
  const [ad, setAd] = useState(2);
  const [ch, setCh] = useState(0);
  const total = price * ad + Math.round(price * 0.5) * ch;
  return (
    <div className="mt-4 space-y-3">
      <div><label className="label">Start date</label><input type="date" className="input" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Adults</label><input type="number" min={1} max={12} className="input" value={ad} onChange={(e) => setAd(Math.max(1, Number(e.target.value)))} /></div>
        <div><label className="label">Children (5–11)</label><input type="number" min={0} max={8} className="input" value={ch} onChange={(e) => setCh(Math.max(0, Number(e.target.value)))} /></div>
      </div>
      <p className="flex justify-between text-sm"><span>Package total</span><b>₹{total.toLocaleString("en-IN")}</b></p>
      <Link href={`/book/holiday?${new URLSearchParams({ pkg: pkgId, date, ad: String(ad), ch: String(ch) })}`} className="btn-accent w-full py-3" data-testid="holiday-book">Book now</Link>
    </div>
  );
}
