import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ExternalLink, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { resourceByKey } from "@/lib/admin-resources";
import { inr, fmtDate } from "@/lib/format";
import { toggleActiveAction } from "@/app/actions/admin";
import { AdminTitle, Pager } from "../../AdminUI";

export const dynamic = "force-dynamic";
const PER = 25;

type Finder = { findMany: (a: object) => Promise<Record<string, unknown>[]>; count: (a: object) => Promise<number> };

function get(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), row);
}

export default async function ResourceList({ params, searchParams }: { params: Promise<{ res: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { res } = await params;
  const sp = await searchParams;
  const r = resourceByKey(res);
  if (!r) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where = q && r.search ? { OR: r.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {};
  const m = (prisma as unknown as Record<string, Finder>)[r.model];
  const [rows, total] = await Promise.all([m.findMany({ where, include: r.include, orderBy: r.orderBy, skip: (page - 1) * PER, take: PER }), m.count({ where })]);
  const hasActive = r.fields.some((f) => f.name === "active");
  return (
    <>
      <AdminTitle title={r.title} subtitle={`${total} records`} action={r.key === "reviews" || r.key === "enquiries" ? undefined : { href: `/admin/r/${r.key}/new`, label: `+ Add ${r.singular.toLowerCase()}` }} />
      {sp.saved && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" role="status">Saved successfully</p>}
      <form className="mb-4 flex max-w-md gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={q} placeholder={`Search ${r.title.toLowerCase()}…`} className="input pl-9" /></div>
        <button className="btn-ghost">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="resource-table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{r.columns.map((c) => <th key={c.name} className="whitespace-nowrap p-3">{c.label}</th>)}<th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const link = r.link?.(row);
              return (
                <tr key={String(row.id)} className="border-t border-slate-100 hover:bg-slate-50">
                  {r.columns.map((c) => {
                    const v = get(row, c.name);
                    let out: React.ReactNode = v == null ? "—" : String(v);
                    if (c.fmt === "inr" && typeof v === "number") out = inr(v);
                    if (c.fmt === "date" && v) out = fmtDate(v as Date);
                    if (c.fmt === "bool") out = c.name === "active" && hasActive ? (
                      <form action={toggleActiveAction}><input type="hidden" name="_res" value={r.key} /><input type="hidden" name="_id" value={String(row.id)} /><input type="hidden" name="_value" value={String(!v)} />
                        <button className={v ? "badge-green" : "badge-red"} title="Toggle">{v ? "Active" : "Inactive"}</button></form>
                    ) : <span className={v ? "badge-green" : "badge-slate"}>{v ? "Yes" : "No"}</span>;
                    return <td key={c.name} className="max-w-xs truncate p-3">{out}</td>;
                  })}
                  <td className="whitespace-nowrap p-3 text-right">
                    {link && <Link href={link} target="_blank" className="mr-2 inline-flex rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="View on site"><ExternalLink className="h-4 w-4" /></Link>}
                    <Link href={`/admin/r/${r.key}/${row.id}`} className="inline-flex rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Edit" data-testid="row-edit"><Pencil className="h-4 w-4" /></Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={r.columns.length + 1} className="p-8 text-center text-slate-500">No records found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/r/${r.key}${q ? `?q=${encodeURIComponent(q)}` : ""}`} />
    </>
  );
}
