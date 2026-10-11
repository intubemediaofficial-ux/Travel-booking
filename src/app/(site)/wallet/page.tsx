import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { AddMoney } from "@/components/AddMoney";
import { razorpayEnabled } from "@/lib/payment";

export const metadata = { title: "Wallet" };

export default async function Page() {
  const user = await requireUser("/wallet");
  const txns = await prisma.walletTxn.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 p-8 text-white">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/80"><Wallet className="h-5 w-5" /> Wallet balance</p>
        <p className="mt-2 text-4xl font-extrabold" data-testid="wallet-balance">₹{user.walletBalance.toLocaleString("en-IN")}</p>
        <p className="mt-1 text-sm text-white/80">Use it on any flight, hotel, holiday, train, bus or cab booking. Refunds land here instantly.</p>
      </div>
      {!razorpayEnabled() && <AddMoney />}
      <h2 className="mt-8 mb-3 text-lg font-extrabold">Transactions</h2>
      <div className="card divide-y">
        {txns.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No transactions yet.</p>}
        {txns.map((t) => (
          <div key={t.id} className="flex items-center gap-4 p-4">
            <span className={`grid h-10 w-10 place-items-center rounded-full ${t.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{t.amount > 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span>
            <div className="flex-1"><p className="font-semibold">{t.note}</p><p className="text-xs text-slate-500">{t.kind} · {fmtDateTime(t.createdAt)}</p></div>
            <p className={`font-extrabold ${t.amount > 0 ? "text-emerald-700" : "text-red-600"}`}>{t.amount > 0 ? "+" : "−"}₹{Math.abs(t.amount).toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
