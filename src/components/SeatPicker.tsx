"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Armchair, BedSingle } from "lucide-react";

type Layout = { sleeper: boolean; decks: { name: string; seats: string[]; cols: number }[] };

export function SeatPicker(p: { busId: string; date: string; layout: Layout; taken: string[]; fare: number; boarding: string[]; dropping: string[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [bp, setBp] = useState(p.boarding[0]);
  const [dp, setDp] = useState(p.dropping[0]);
  const [err, setErr] = useState("");
  const router = useRouter();
  const taken = new Set(p.taken);
  const toggle = (s: string) => {
    setErr("");
    setSel((x) => (x.includes(s) ? x.filter((y) => y !== s) : x.length >= 6 ? (setErr("Max 6 seats per booking"), x) : [...x, s]));
  };
  const Icon = p.layout.sleeper ? BedSingle : Armchair;
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="h-4 w-4 rounded border-2 border-emerald-500 bg-white" /> Available</span>
          <span className="flex items-center gap-1"><span className="h-4 w-4 rounded bg-brand-600" /> Selected</span>
          <span className="flex items-center gap-1"><span className="h-4 w-4 rounded bg-slate-300" /> Booked</span>
        </div>
        <div className="flex flex-wrap gap-8">
          {p.layout.decks.map((d) => (
            <div key={d.name}>
              <p className="mb-2 text-sm font-bold">{d.name}</p>
              <div className="grid gap-2 rounded-2xl border-2 border-slate-200 p-4" style={{ gridTemplateColumns: `repeat(${d.cols + 1}, minmax(0, 1fr))` }}>
                {d.seats.map((s, i) => {
                  const isTaken = taken.has(s);
                  const isSel = sel.includes(s);
                  const aisle = d.cols === 4 ? i % 4 === 2 : i % 3 === 1;
                  return (
                    <div key={s} className="contents">
                      {aisle && <span />}
                      <button type="button" disabled={isTaken} onClick={() => toggle(s)} title={s} data-testid={`seat-${s}`}
                        className={`flex ${p.layout.sleeper ? "h-16 w-10" : "h-10 w-10"} flex-col items-center justify-center rounded-lg text-[10px] font-bold transition ${isTaken ? "cursor-not-allowed bg-slate-300 text-slate-500" : isSel ? "bg-brand-600 text-white" : "border-2 border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50"}`}>
                        <Icon className="h-4 w-4" />{s}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-20">
        <div><label className="label">Boarding point</label><select className="input" value={bp} onChange={(e) => setBp(e.target.value)}>{p.boarding.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><label className="label">Dropping point</label><select className="input" value={dp} onChange={(e) => setDp(e.target.value)}>{p.dropping.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="border-t pt-3 text-sm">
          <p className="flex justify-between"><span>Seats</span><b>{sel.join(", ") || "—"}</b></p>
          <p className="mt-1 flex justify-between"><span>Fare</span><b>₹{(sel.length * p.fare).toLocaleString("en-IN")}</b></p>
        </div>
        {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
        <button type="button" disabled={!sel.length} className="btn-accent w-full py-3" data-testid="bus-continue"
          onClick={() => router.push(`/book/bus?${new URLSearchParams({ bus: p.busId, date: p.date, seats: sel.join(","), bp, dp })}`)}>
          {sel.length ? `Continue with ${sel.length} seat${sel.length > 1 ? "s" : ""}` : "Select seats"}
        </button>
      </aside>
    </div>
  );
}
