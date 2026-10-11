import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { OpForm } from "@/components/AdminForms";
import { adminUserAction } from "@/app/actions/admin";
import { AdminTitle, STATUS_BADGE } from "../../AdminUI";

export const dynamic = "force-dynamic";

export default async function UserAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id }, include: { bookings: { orderBy: { createdAt: "desc" }, take: 20 }, walletTxns: { orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!u) notFound();
  return (
    <div className="max-w-5xl">
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600"><ArrowLeft className="h-4 w-4" /> Users</Link>
      <AdminTitle title={u.name} subtitle={`${u.email} · ${u.phone ?? "no phone"} · joined ${fmtDate(u.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card overflow-x-auto"><h2 className="p-4 font-bold">Bookings</h2>
            <table className="w-full text-left text-sm"><tbody>
              {u.bookings.map((b) => <tr key={b.id} className="border-t border-slate-100"><td className="p-3 font-mono font-bold text-brand-700"><Link href={`/admin/bookings/${b.ref}`}>{b.ref}</Link></td><td className="p-3">{b.title}</td><td className="p-3">{fmtDate(b.travelDate)}</td><td className="p-3">{inr(b.total)}</td><td className="p-3"><span className={STATUS_BADGE[b.status]}>{b.status.replace("_", " ")}</span></td></tr>)}
              {u.bookings.length === 0 && <tr><td className="p-4 text-slate-500">No bookings yet.</td></tr>}
            </tbody></table>
          </div>
          <div className="card overflow-x-auto"><h2 className="p-4 font-bold">Wallet history</h2>
            <table className="w-full text-left text-sm"><tbody>
              {u.walletTxns.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="p-3">{fmtDateTime(t.createdAt)}</td><td className="p-3">{t.note}</td><td className={`p-3 text-right font-bold ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>{t.amount > 0 ? "+" : ""}{inr(t.amount)}</td></tr>)}
              {u.walletTxns.length === 0 && <tr><td className="p-4 text-slate-500">No transactions.</td></tr>}
            </tbody></table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4"><p className="text-xs font-bold uppercase text-slate-500">Wallet balance</p><p className="text-2xl font-extrabold">{inr(u.walletBalance)}</p></div>
          <div className="card p-4"><h3 className="mb-2 font-bold">Adjust wallet</h3>
            <OpForm action={adminUserAction} hidden={{ id: u.id, op: "wallet" }} label="Apply"><input name="amount" type="number" className="input" placeholder="e.g. 500 or -200" required /><input name="note" className="input" placeholder="Note (e.g. goodwill credit)" /></OpForm></div>
          <div className="card p-4"><h3 className="mb-2 font-bold">Role</h3>
            <OpForm action={adminUserAction} hidden={{ id: u.id, op: "role" }} label="Update role"><select name="role" defaultValue={u.role} className="input"><option>USER</option><option>ADMIN</option></select></OpForm></div>
          <div className="card p-4"><h3 className="mb-2 font-bold">Account status</h3>
            <OpForm action={adminUserAction} hidden={{ id: u.id, op: u.blocked ? "unblock" : "block" }} label={u.blocked ? "Unblock user" : "Block user"} danger={!u.blocked} /></div>
        </div>
      </div>
    </div>
  );
}
