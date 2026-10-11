"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";
import { Msg } from "@/components/AuthForms";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, act, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={act} className="card space-y-3 p-6">
      <h2 className="text-lg font-bold">Profile</h2>
      <div><label className="label">Email</label><input className="input bg-slate-50" value={email} disabled /></div>
      <div><label className="label">Full name</label><input name="name" required defaultValue={name} className="input" /></div>
      <div><label className="label">Mobile</label><input name="phone" defaultValue={phone} className="input" /></div>
      <Msg s={state} />
      <button className="btn-primary" disabled={pending}>Save profile</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, act, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={act} className="card space-y-3 p-6">
      <h2 className="text-lg font-bold">Change password</h2>
      <div><label className="label">Current password</label><input name="current" type="password" required className="input" /></div>
      <div><label className="label">New password</label><input name="password" type="password" minLength={6} required className="input" /></div>
      <Msg s={state} />
      <button className="btn-primary" disabled={pending}>Update password</button>
    </form>
  );
}
