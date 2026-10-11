"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="mt-auto flex w-fit items-center gap-2 rounded-lg border border-dashed border-brand-400 bg-brand-50 px-2.5 py-1 pt-1 text-xs font-bold tracking-wider text-brand-700"
    >
      {code} <span className="font-semibold text-slate-500">{done ? "Copied!" : "Copy"}</span>
    </button>
  );
}
