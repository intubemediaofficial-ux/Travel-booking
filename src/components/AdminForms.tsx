"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { Field } from "@/lib/admin-resources";
import { saveResourceAction, type AdminState } from "@/app/actions/admin";

type Opt = { id: string; label: string };

function value(f: Field, v: unknown): string {
  if (v == null) return "";
  if (f.type === "list") return Array.isArray(v) ? v.join("\n") : String(v);
  if (f.type === "json") return JSON.stringify(v, null, 2);
  if (f.type === "date") return new Date(v as string).toISOString().slice(0, 10);
  return String(v);
}

export function Notice({ state }: { state: AdminState }) {
  if (state?.error) return <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" role="status">{state.ok}</p>;
  return null;
}

export function ResourceForm({ res, id, fields, row, refs }: { res: string; id: string; fields: Field[]; row: Record<string, unknown> | null; refs: Record<string, Opt[]> }) {
  const [state, action, pending] = useActionState(saveResourceAction, undefined);
  return (
    <form action={action} className="card space-y-5 p-6" data-testid="resource-form">
      <input type="hidden" name="_res" value={res} />
      <input type="hidden" name="_id" value={id} />
      <Notice state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const v = row ? row[f.name] : f.type === "bool" ? f.name === "active" || f.name === "approved" || f.name === "showAsOffer" : undefined;
          const wide = ["textarea", "list", "json"].includes(f.type);
          return (
            <div key={f.name} className={wide ? "md:col-span-2" : ""}>
              {f.type === "bool" ? (
                <label className="flex items-center gap-2 pt-6 text-sm font-semibold"><input type="checkbox" name={f.name} defaultChecked={!!v} className="h-4 w-4 accent-brand-600" /> {f.label}</label>
              ) : (
                <>
                  <label className="label" htmlFor={f.name}>{f.label}{f.required && " *"}</label>
                  {f.type === "textarea" || f.type === "list" || f.type === "json" ? (
                    <textarea id={f.name} name={f.name} rows={f.type === "json" ? 8 : 4} className={`input ${f.type === "json" ? "font-mono text-xs" : ""}`} defaultValue={value(f, v)} required={f.required} />
                  ) : f.type === "select" ? (
                    <select id={f.name} name={f.name} className="input" defaultValue={value(f, v) || f.options?.[0]}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
                  ) : f.type === "ref" ? (
                    <select id={f.name} name={f.name} className="input" defaultValue={value(f, v)} required={f.required}>
                      <option value="">Select…</option>
                      {refs[f.name]?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input id={f.name} name={f.name} className="input" type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"} step={f.type === "number" ? "any" : undefined} defaultValue={value(f, v)} required={f.required} />
                  )}
                  {f.help && <p className="mt-1 text-xs text-slate-400">{f.help}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn-primary" disabled={pending} data-testid="resource-save">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
    </form>
  );
}

export function OpForm({ action, hidden, children, label, danger, confirm: ask }: {
  action: (s: AdminState, fd: FormData) => Promise<AdminState>; hidden: Record<string, string>; children?: React.ReactNode; label: string; danger?: boolean; confirm?: string;
}) {
  const [state, act, pending] = useActionState(action, undefined);
  return (
    <form action={act} className="space-y-3" onSubmit={(e) => { if (ask && !window.confirm(ask)) e.preventDefault(); }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <Notice state={state} />
      <button className={danger ? "btn-danger" : "btn-primary"} disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>
    </form>
  );
}
