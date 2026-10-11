"use client";

import { useActionState, useState } from "react";
import { addMoneyAction } from "@/app/actions/user";

export function AddMoney() {
  const [state, act, pending] = useActionState(addMoneyAction, undefined);
  const [amt, setAmt] = useState("1000");
  return (
    <form action={act} className="card mt-5 flex flex-wrap items-end gap-3 p-5">
      <div className="flex-1">
        <label className="label">Add money</label>
        <input name="amount" type="number" min={100} max={50000} className="input" value={amt} onChange={(e) => setAmt(e.target.value)} data-testid="topup-amount" />
        <div className="mt-2 flex gap-2">{["500", "1000", "2000", "5000"].map((a) => <button key={a} type="button" className="chip" onClick={() => setAmt(a)}>+₹{a}</button>)}</div>
      </div>
      <select name="method" className="input w-40"><option>UPI</option><option>Card</option><option>Net banking</option></select>
      <button className="btn-primary" disabled={pending} data-testid="topup-btn">Add ₹{Number(amt || 0).toLocaleString("en-IN")}</button>
      {state?.error && <p className="w-full text-sm font-semibold text-red-600">{state.error}</p>}
      {state?.ok && <p className="w-full text-sm font-semibold text-emerald-700">{state.ok}</p>}
    </form>
  );
}
