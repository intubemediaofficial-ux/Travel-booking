"use client";

import { useActionState, useState } from "react";
import { cancelAction } from "@/app/actions/booking";

export function CancelBox({ ref_, allowed, refund, note, paid }: { ref_: string; allowed: boolean; refund: number; note: string; paid: number }) {
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState(cancelAction, undefined);
  return (
    <section className="card no-print mt-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold">Cancel booking</h2>
          <p className="text-sm text-slate-600">{allowed ? <>Refund: <b className="text-emerald-700">₹{refund.toLocaleString("en-IN")}</b> of ₹{paid.toLocaleString("en-IN")} · {note}</> : note}</p>
        </div>
        {allowed && !open && <button type="button" className="btn-danger" onClick={() => setOpen(true)} data-testid="cancel-open">Cancel booking</button>}
      </div>
      {open && (
        <form action={act} className="mt-4 space-y-3 border-t pt-4">
          <input type="hidden" name="ref" value={ref_} />
          <div>
            <label className="label">Reason</label>
            <select name="reason" className="input"><option>Change of plans</option><option>Booked by mistake</option><option>Found a better price</option><option>Medical emergency</option><option>Other</option></select>
          </div>
          <fieldset className="space-y-1 text-sm">
            <legend className="label">Refund to</legend>
            <label className="flex items-center gap-2"><input type="radio" name="refundTo" value="WALLET" defaultChecked className="accent-brand-600" /> Wallet (instant)</label>
            <label className="flex items-center gap-2"><input type="radio" name="refundTo" value="SOURCE" className="accent-brand-600" /> Original payment method (5–7 working days)</label>
          </fieldset>
          {state?.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button className="btn-danger" disabled={pending} data-testid="cancel-confirm">Confirm cancellation</button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Keep booking</button>
          </div>
        </form>
      )}
    </section>
  );
}
