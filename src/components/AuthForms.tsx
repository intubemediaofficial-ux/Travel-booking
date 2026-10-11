"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction, forgotAction, resetAction, type FormState } from "@/app/actions/auth";

function Msg({ s }: { s: FormState }) {
  if (!s) return null;
  return s.error ? (
    <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{s.error}</p>
  ) : s.ok ? (
    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{s.ok}</p>
  ) : null;
}

export function LoginForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState(loginAction, undefined);
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" placeholder="you@example.com" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required className="input" placeholder="••••••" /></div>
      <Msg s={s} />
      <button className="btn-primary w-full py-3" disabled={pending}>{pending ? "Logging in…" : "Login"}</button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-600">Forgot password?</Link>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600">Create account</Link>
      </div>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [s, act, pending] = useActionState(signupAction, undefined);
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required className="input" placeholder="As per ID proof" /></div>
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
      <div><label className="label" htmlFor="phone">Mobile number</label><input id="phone" name="phone" required className="input" placeholder="98765 43210" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={6} className="input" /></div>
      <Msg s={s} />
      <button className="btn-primary w-full py-3" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-sm">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600">Login</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [s, act, pending] = useActionState(forgotAction, undefined);
  return (
    <form action={act} className="space-y-4">
      <div><label className="label" htmlFor="email">Registered email</label><input id="email" name="email" type="email" required className="input" /></div>
      <Msg s={s} />
      <button className="btn-primary w-full py-3" disabled={pending}>Send reset link</button>
      <p className="text-center text-sm"><Link href="/login" className="font-semibold text-brand-600">Back to login</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, act, pending] = useActionState(resetAction, undefined);
  return (
    <form action={act} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={6} required className="input" /></div>
      <Msg s={s} />
      <button className="btn-primary w-full py-3" disabled={pending}>Set new password</button>
    </form>
  );
}

export { Msg };
