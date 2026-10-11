import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addTravellerAction, removeTravellerAction } from "@/app/actions/auth";
import { ProfileForm, PasswordForm } from "@/components/AccountForms";
import { UserRound, Trash2 } from "lucide-react";

export const metadata = { title: "My account" };

export default async function Page() {
  const user = await requireUser("/account");
  const [travellers, stats] = await Promise.all([
    prisma.savedTraveller.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.booking.count({ where: { userId: user.id, status: { in: ["CONFIRMED", "COMPLETED"] } } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="card mb-6 flex items-center gap-4 p-6">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white">{user.name[0]?.toUpperCase()}</span>
        <div><h1 className="text-2xl font-bold">{user.name}</h1><p className="text-sm text-slate-500">{user.email} · {stats} trips · Wallet ₹{user.walletBalance.toLocaleString("en-IN")}</p></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} />
        <PasswordForm />
      </div>
      <section className="card mt-6 p-6">
        <h2 className="mb-4 text-lg font-bold">Saved travellers</h2>
        <div className="space-y-2">
          {travellers.length === 0 && <p className="text-sm text-slate-500">No saved travellers yet.</p>}
          {travellers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2">
              <UserRound className="h-5 w-5 text-brand-600" />
              <p className="flex-1 text-sm"><b>{t.name}</b> · {t.age} yrs · {t.gender}</p>
              <form action={removeTravellerAction}><input type="hidden" name="id" value={t.id} /><button className="text-red-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></form>
            </div>
          ))}
        </div>
        <form action={addTravellerAction} className="mt-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input name="name" required placeholder="Full name" className="input" />
          <input name="age" type="number" min={1} max={119} required placeholder="Age" className="input" />
          <select name="gender" className="input"><option>Male</option><option>Female</option><option>Other</option></select>
          <button className="btn-primary">Add</button>
        </form>
      </section>
    </div>
  );
}
