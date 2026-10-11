"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { reviewAction } from "@/app/actions/booking";

export function ReviewForm({ hotelId, loggedIn, back }: { hotelId: string; loggedIn: boolean; back: string }) {
  const [state, act, pending] = useActionState(reviewAction, undefined);
  const [r, setR] = useState(0);
  if (!loggedIn) return <p className="text-sm"><Link href={`/login?next=${encodeURIComponent(back)}`} className="font-bold text-brand-600">Login</Link> to write a review.</p>;
  return (
    <form action={act} className="card space-y-3 p-4">
      <p className="font-extrabold">Write a review</p>
      <input type="hidden" name="hotelId" value={hotelId} />
      <input type="hidden" name="rating" value={r} />
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setR(n)} aria-label={`${n} star`}><Star className={`h-6 w-6 ${n <= r ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>)}</div>
      <input name="title" className="input" placeholder="Title (optional)" />
      <textarea name="comment" rows={3} className="input" placeholder="Tell others about your stay" />
      {state?.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>Submit review</button>
    </form>
  );
}
