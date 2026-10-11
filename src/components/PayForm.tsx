"use client";

import { useActionState, useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Smartphone, Loader2, Timer } from "lucide-react";
import { mockPayAction, razorpayVerifyAction } from "@/app/actions/booking";

declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open: () => void };
  }
}

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda", "Yes Bank"];

export function PayForm(props: {
  ref_: string;
  total: number;
  expiresAt: number;
  razorpay?: { key: string; orderId: string; name: string; email: string; phone: string; site: string };
}) {
  const [state, act, pending] = useActionState(mockPayAction, undefined);
  const [method, setMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [left, setLeft] = useState(() => Math.max(0, props.expiresAt - Date.now()));
  const [rzErr, setRzErr] = useState("");
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, props.expiresAt - Date.now())), 1000);
    return () => clearInterval(t);
  }, [props.expiresAt]);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  if (left === 0)
    return (
      <div className="card p-8 text-center">
        <Timer className="mx-auto h-10 w-10 text-red-500" />
        <p className="mt-3 text-lg font-extrabold">Payment session expired</p>
        <p className="text-sm text-slate-500">Your seats/rooms have been released. Please search and book again.</p>
        <Link href="/" className="btn-primary mt-5">Back to home</Link>
      </div>
    );

  const openRazorpay = () => {
    const rz = props.razorpay!;
    if (!window.Razorpay) return setRzErr("Payment gateway is loading, please try again");
    new window.Razorpay({
      key: rz.key, order_id: rz.orderId, amount: props.total * 100, currency: "INR", name: rz.site, description: `Booking ${props.ref_}`,
      prefill: { name: rz.name, email: rz.email, contact: rz.phone }, theme: { color: "#0a6cf1" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const res = await razorpayVerifyAction(props.ref_, r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
        if (res.error) setRzErr(res.error);
        else router.push(`/my-trips/${props.ref_}?paid=1`);
      },
    }).open();
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
        <span>Complete payment to confirm your booking</span>
        <span className="flex items-center gap-1 font-extrabold" data-testid="timer"><Timer className="h-4 w-4" /> {mm}:{ss}</span>
      </div>
      {props.razorpay ? (
        <div className="p-6">
          <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
          <p className="mb-4 text-sm text-slate-600">Pay securely using UPI, cards, net banking or wallets via Razorpay.</p>
          {rzErr && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{rzErr}</p>}
          <button type="button" onClick={openRazorpay} className="btn-accent w-full py-4 text-base">Pay ₹{props.total.toLocaleString("en-IN")}</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="flex border-b md:flex-col md:border-b-0 md:border-r">
            {([["UPI", Smartphone, "UPI"], ["CARD", CreditCard, "Credit / Debit card"], ["NETBANKING", Landmark, "Net banking"]] as const).map(([k, I, l]) => (
              <button key={k} type="button" onClick={() => setMethod(k)} className={`flex flex-1 items-center gap-2 px-4 py-4 text-left text-sm font-bold ${method === k ? "bg-brand-50 text-brand-700 md:border-l-4 md:border-brand-600" : "text-slate-600 hover:bg-slate-50"}`}>
                <I className="h-5 w-5" /> {l}
              </button>
            ))}
          </div>
          <form action={act} className="space-y-4 p-6">
            <input type="hidden" name="ref" value={props.ref_} />
            <input type="hidden" name="method" value={method} />
            {method === "UPI" && (
              <div><label className="label">UPI ID</label><input name="upi" className="input" placeholder="yourname@okhdfc" required data-testid="upi" /></div>
            )}
            {method === "CARD" && (
              <>
                <div><label className="label">Card number</label><input name="card" inputMode="numeric" className="input" placeholder="4111 1111 1111 1111" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Expiry (MM/YY)</label><input name="exp" className="input" placeholder="12/29" required /></div>
                  <div><label className="label">CVV</label><input name="cvv" type="password" inputMode="numeric" maxLength={4} className="input" required /></div>
                </div>
                <div><label className="label">Name on card</label><input name="cardName" className="input" required /></div>
              </>
            )}
            {method === "NETBANKING" && (
              <div className="grid grid-cols-2 gap-2">
                {BANKS.map((b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input type="radio" name="bank" value={b} className="accent-brand-600" /> {b}
                  </label>
                ))}
              </div>
            )}
            {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{state.error}</p>}
            <button className="btn-accent w-full py-4 text-base" disabled={pending} data-testid="pay-now">
              {pending && <Loader2 className="h-5 w-5 animate-spin" />} Pay ₹{props.total.toLocaleString("en-IN")}
            </button>
            <p className="text-center text-xs text-slate-400">Test mode: no real money is charged until the payment gateway is connected.</p>
          </form>
        </div>
      )}
    </div>
  );
}
