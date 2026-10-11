"use client";

import { useActionState, useState, useTransition } from "react";
import { BadgePercent, Wallet, ShieldCheck, Loader2 } from "lucide-react";
import { bookAction, checkCouponAction } from "@/app/actions/booking";
import { quote, type Svc } from "@/lib/pricing";

type Coupon = { code: string; title: string };
type Saved = { name: string; age: number; gender: string };

export function CheckoutForm(props: {
  svc: Svc;
  base: number;
  pax: number;
  nightly?: number;
  travellers: number;
  mode: "full" | "lead";
  berth?: boolean;
  params: Record<string, string>;
  wallet: number;
  contact: { name: string; email: string; phone: string };
  coupons: Coupon[];
  saved: Saved[];
  pickup?: boolean;
}) {
  const [state, act, pending] = useActionState(bookAction, undefined);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [cErr, setCErr] = useState("");
  const [checking, start] = useTransition();
  const [useWallet, setUseWallet] = useState(false);
  const [names, setNames] = useState<Saved[]>(Array.from({ length: props.travellers }, (_, i) => (i === 0 && props.mode === "lead" ? { name: props.contact.name, age: 30, gender: "Male" } : { name: "", age: 0, gender: "Male" })));
  const q = quote({ svc: props.svc, base: props.base, pax: props.pax, nightly: props.nightly, discount: applied?.discount ?? 0, wallet: useWallet ? props.wallet : 0 });

  const apply = (c: string) =>
    start(async () => {
      setCErr("");
      const r = await checkCouponAction(c, props.svc, props.base);
      if (r.ok) {
        setApplied({ code: c.toUpperCase(), discount: r.discount });
        setCode(c.toUpperCase());
      } else {
        setApplied(null);
        setCErr(r.error ?? "Invalid coupon");
      }
    });

  const fill = (i: number, s: Saved) => setNames((n) => n.map((x, j) => (j === i ? s : x)));

  return (
    <form action={act} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="svc" value={props.svc} />
      {Object.entries(props.params).map(([k, v]) => <input key={k} type="hidden" name={`p_${k}`} value={v} />)}
      <input type="hidden" name="coupon" value={applied?.code ?? ""} />
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-extrabold">{props.mode === "lead" ? "Guest details" : "Traveller details"}</h2>
          {props.saved.length > 0 && props.mode === "full" && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">Saved travellers:</span>
              {props.saved.map((s) => (
                <button key={s.name} type="button" className="chip hover:bg-brand-50" onClick={() => { const i = names.findIndex((n) => !n.name); fill(i === -1 ? 0 : i, s); }}>+ {s.name}</button>
              ))}
            </div>
          )}
          <div className="space-y-4">
            {names.map((t, i) => (
              <div key={i} className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <div>
                  <label className="label">{props.mode === "lead" ? "Primary guest full name" : `Traveller ${i + 1} full name`}</label>
                  <input name={`t${i}_name`} className="input" required value={t.name} onChange={(e) => fill(i, { ...t, name: e.target.value })} placeholder="As on government ID" />
                </div>
                {props.mode === "full" && (
                  <>
                    <div><label className="label">Age</label><input name={`t${i}_age`} type="number" min={1} max={119} required className="input" value={t.age || ""} onChange={(e) => fill(i, { ...t, age: Number(e.target.value) })} /></div>
                    <div>
                      <label className="label">Gender</label>
                      <select name={`t${i}_gender`} className="input" value={t.gender} onChange={(e) => fill(i, { ...t, gender: e.target.value })}>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                  </>
                )}
                {props.berth && (
                  <div>
                    <label className="label">Berth</label>
                    <select name={`t${i}_berth`} className="input"><option>No preference</option><option>Lower</option><option>Middle</option><option>Upper</option><option>Side Lower</option><option>Window</option></select>
                  </div>
                )}
              </div>
            ))}
          </div>
          {props.mode === "full" && (
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="saveTravellers" className="accent-brand-600" defaultChecked /> Save travellers for faster booking next time</label>
          )}
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-extrabold">Contact details <span className="text-sm font-normal text-slate-500">(e-ticket will be sent here)</span></h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Email</label><input name="email" type="email" required defaultValue={props.contact.email} className="input" /></div>
            <div><label className="label">Mobile</label><input name="phone" required defaultValue={props.contact.phone} className="input" placeholder="98765 43210" /></div>
            {props.pickup && <div className="sm:col-span-2"><label className="label">Pickup address</label><input name="pickup" required className="input" placeholder="House no, street, landmark" /></div>}
            <div className="sm:col-span-2"><label className="label">Special requests (optional)</label><textarea name="notes" rows={2} className="input" placeholder="Early check-in, wheelchair, meal preference…" /></div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-extrabold">Fare summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Base fare</dt><dd>₹{q.base.toLocaleString("en-IN")}</dd></div>
            <div className="flex justify-between"><dt>Taxes & GST</dt><dd>₹{q.taxes.toLocaleString("en-IN")}</dd></div>
            {q.fee > 0 && <div className="flex justify-between"><dt>Convenience fee</dt><dd>₹{q.fee.toLocaleString("en-IN")}</dd></div>}
            {q.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon ({applied?.code})</dt><dd>− ₹{q.discount.toLocaleString("en-IN")}</dd></div>}
            {q.walletUsed > 0 && <div className="flex justify-between text-emerald-700"><dt>Wallet</dt><dd>− ₹{q.walletUsed.toLocaleString("en-IN")}</dd></div>}
            <div className="flex justify-between border-t border-dashed pt-3 text-lg font-extrabold"><dt>Total</dt><dd data-testid="total">₹{q.total.toLocaleString("en-IN")}</dd></div>
          </dl>
        </section>
        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-extrabold"><BadgePercent className="h-5 w-5 text-accent-500" /> Coupons & offers</h3>
          <div className="flex gap-2">
            <input className="input uppercase" placeholder="Enter coupon code" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Coupon code" />
            <button type="button" className="btn-ghost" disabled={!code || checking} onClick={() => apply(code)}>{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}</button>
          </div>
          {cErr && <p className="mt-2 text-xs font-semibold text-red-600">{cErr}</p>}
          {applied && <p className="mt-2 text-xs font-semibold text-emerald-700">“{applied.code}” applied — you save ₹{applied.discount.toLocaleString("en-IN")}! <button type="button" className="underline" onClick={() => { setApplied(null); setCode(""); }}>Remove</button></p>}
          <ul className="mt-3 space-y-2">
            {props.coupons.map((c) => (
              <li key={c.code}>
                <button type="button" onClick={() => apply(c.code)} className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${applied?.code === c.code ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-brand-300"}`}>
                  <span className="font-extrabold tracking-wide text-brand-700">{c.code}</span> — {c.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
        {props.wallet > 0 && (
          <label className="card flex cursor-pointer items-center gap-3 p-5">
            <input type="checkbox" name="useWallet" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="h-5 w-5 accent-brand-600" />
            <Wallet className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-semibold">Use wallet balance <span className="text-emerald-700">₹{props.wallet.toLocaleString("en-IN")}</span></span>
          </label>
        )}
        {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{state.error}</p>}
        <button className="btn-accent w-full py-4 text-base" disabled={pending} data-testid="continue-pay">
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null} {q.total === 0 ? "Confirm booking" : `Continue to pay ₹${q.total.toLocaleString("en-IN")}`}
        </button>
        <p className="flex items-center justify-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" /> Safe & secure checkout</p>
      </aside>
    </form>
  );
}
