import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { resourceByKey } from "@/lib/admin-resources";
import { ResourceForm } from "@/components/AdminForms";
import { deleteResourceAction } from "@/app/actions/admin";
import { DeleteButton } from "@/components/DeleteButton";
import { AdminTitle } from "../../../AdminUI";

export const dynamic = "force-dynamic";

type Finder = { findUnique: (a: object) => Promise<Record<string, unknown> | null>; findMany: (a: object) => Promise<Record<string, unknown>[]> };

export default async function ResourceEdit({ params }: { params: Promise<{ res: string; id: string }> }) {
  const { res, id } = await params;
  const r = resourceByKey(res);
  if (!r) notFound();
  const db = prisma as unknown as Record<string, Finder>;
  const row = id === "new" ? null : await db[r.model].findUnique({ where: { id } });
  if (id !== "new" && !row) notFound();
  const refs: Record<string, { id: string; label: string }[]> = {};
  for (const f of r.fields.filter((x) => x.type === "ref" && x.ref)) {
    const rows = await db[f.ref!.model].findMany({ select: { id: true, [f.ref!.label]: true }, orderBy: { [f.ref!.label]: "asc" } });
    refs[f.name] = rows.map((x) => ({ id: String(x.id), label: String(x[f.ref!.label]) }));
  }
  return (
    <div className="max-w-4xl">
      <Link href={`/admin/r/${r.key}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600"><ArrowLeft className="h-4 w-4" /> {r.title}</Link>
      <AdminTitle title={id === "new" ? `Add ${r.singular.toLowerCase()}` : `Edit ${r.singular.toLowerCase()}`} />
      <ResourceForm res={r.key} id={id} fields={r.fields} row={row} refs={refs} />
      {row && (
        <form action={deleteResourceAction} className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
          <input type="hidden" name="_res" value={r.key} /><input type="hidden" name="_id" value={id} />
          <div><p className="font-bold text-red-700">Delete this {r.singular.toLowerCase()}</p><p className="text-sm text-slate-500">Existing bookings keep their saved details. Prefer marking inactive to hide it from customers.</p></div>
          <DeleteButton />
        </form>
      )}
    </div>
  );
}
