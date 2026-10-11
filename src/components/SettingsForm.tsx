"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveSettingsAction } from "@/app/actions/admin";
import { Notice } from "./AdminForms";

const LABEL: Record<string, string> = { siteName: "Site name", tagline: "Tagline", supportPhone: "Support phone", supportEmail: "Support email", address: "Address", heroTitle: "Homepage headline", heroSubtitle: "Homepage sub-headline", whatsapp: "WhatsApp number", facebook: "Facebook URL", instagram: "Instagram URL", twitter: "X / Twitter URL", youtube: "YouTube URL" };

export function SettingsForm({ values, keys }: { values: Record<string, string>; keys: string[] }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <Notice state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((k) => (
          <div key={k} className={k === "heroSubtitle" || k === "address" ? "md:col-span-2" : ""}>
            <label className="label" htmlFor={k}>{LABEL[k] ?? k}</label>
            {k === "heroSubtitle" ? <textarea id={k} name={k} className="input" rows={2} defaultValue={values[k]} /> : <input id={k} name={k} className="input" defaultValue={values[k]} />}
          </div>
        ))}
      </div>
      <button className="btn-primary" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Save settings</button>
    </form>
  );
}
