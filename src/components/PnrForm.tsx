"use client";

import { useActionState } from "react";
import { pnrAction } from "@/app/actions/user";

type R = { error?: string; result?: { pnr: string; type: string; title: string; subtitle: string; status: string; travelDate: string; pax: { name: string; age: number; status: string }[] } } | undefined;

export function PnrForm() {
  const [state, act, pending] = useActionState(pnrAction as (s: R, f: FormData) => Promise<R>, undefined);
  const r = state?.result;
  return (
    <div className="space-y-5">
      <form action={act} className="card flex gap-2 p-5">
        <input name="pnr" required placeholder="Enter PNR number" className="input uppercase" data-testid="pnr-input" />
        <button className="btn-primary" disabled={pending}>Check status</button>
      </form>
      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.error}</p>}
      {r && (
        <div className="card p-5" data-testid="pnr-result">
          <p className="text-xs font-bold uppercase text-slate-400">PNR {r.pnr} · {r.type}</p>
          <p className="text-lg font-extrabold">{r.title}</p>
          <p className="text-sm text-slate-500">{r.subtitle}</p>
          <p className="mt-1 text-sm">Journey: <b>{new Date(r.travelDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</b> · Status: <b className={r.status === "CANCELLED" ? "text-red-600" : "text-emerald-700"}>{r.status}</b></p>
          <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-xs uppercase text-slate-400"><th>#</th><th>Passenger</th><th>Age</th><th>Current status</th></tr></thead>
            <tbody>{r.pax.map((p, i) => <tr key={i} className="border-t"><td className="py-2">{i + 1}</td><td>{p.name}</td><td>{p.age}</td><td className="font-bold">{p.status}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}
