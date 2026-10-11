"use client";

import { useActionState } from "react";
import { enquiryAction } from "@/app/actions/booking";

export function EnquiryForm({ packageId, subject = "General enquiry", title = "Need help? Talk to an expert" }: { packageId?: string; subject?: string; title?: string }) {
  const [state, act, pending] = useActionState(enquiryAction, undefined);
  if (state?.ok) return <div className="card bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">{state.ok}</div>;
  return (
    <form action={act} className="card space-y-3 p-5">
      <h3 className="font-extrabold">{title}</h3>
      {packageId && <input type="hidden" name="packageId" value={packageId} />}
      <input type="hidden" name="subject" value={subject} />
      <input name="name" className="input" placeholder="Your name" required />
      <input name="email" type="email" className="input" placeholder="Email" required />
      <input name="phone" className="input" placeholder="Mobile number" required />
      <textarea name="message" rows={3} className="input" placeholder="Travel dates, number of people, budget…" required />
      {state?.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>Request callback</button>
    </form>
  );
}
