import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";
import { AdminTitle, Pager } from "../AdminUI";

export const dynamic = "force-dynamic";
const PER = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] } : {};
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { bookings: true } } } }),
    prisma.user.count({ where }),
  ]);
  return (
    <>
      <AdminTitle title="Users" subtitle={`${total} registered customers`} />
      <form className="mb-4 flex max-w-md gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className="input pl-9" /></div><button className="btn-ghost">Search</button></form>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="users-table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Role</th><th className="p-3">Bookings</th><th className="p-3">Wallet</th><th className="p-3">Joined</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-semibold text-brand-700"><Link href={`/admin/users/${u.id}`}>{u.name}</Link></td><td className="p-3">{u.email}</td><td className="p-3">{u.phone ?? "—"}</td>
                <td className="p-3"><span className={u.role === "ADMIN" ? "badge-blue" : "badge-slate"}>{u.role}</span></td><td className="p-3">{u._count.bookings}</td><td className="p-3">{inr(u.walletBalance)}</td><td className="p-3">{fmtDate(u.createdAt)}</td>
                <td className="p-3"><span className={u.blocked ? "badge-red" : "badge-green"}>{u.blocked ? "Blocked" : "Active"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/users${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`} />
    </>
  );
}
