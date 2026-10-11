import Link from "next/link";

export function AdminTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      {action && <Link href={action.href} className="btn-primary">{action.label}</Link>}
    </div>
  );
}

export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      {page > 1 && <Link className="btn-ghost px-3 py-1.5" href={href(page - 1)}>Prev</Link>}
      <span className="text-slate-500">Page {page} of {pages}</span>
      {page < pages && <Link className="btn-ghost px-3 py-1.5" href={href(page + 1)}>Next</Link>}
    </div>
  );
}

export const STATUS_BADGE: Record<string, string> = { CONFIRMED: "badge-green", PENDING_PAYMENT: "badge-amber", CANCELLED: "badge-red", COMPLETED: "badge-blue" };
