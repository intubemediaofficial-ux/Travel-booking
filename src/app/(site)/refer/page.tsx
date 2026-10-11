import { Gift, Users, Wallet, Share2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { REFERRAL_BONUS, ensureReferralCode } from "@/lib/referral";
import { PageTitle } from "@/components/ui";
import { CopyCode } from "@/components/CopyCode";
import { inr } from "@/lib/format";

export const metadata = { title: "Refer & Earn" };

export default async function Page() {
  const user = await requireUser("/refer");
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const code = await ensureReferralCode(full);
  const [joined, earned] = await Promise.all([
    prisma.user.count({ where: { referredById: user.id } }),
    prisma.walletTxn.aggregate({ where: { userId: user.id, kind: "REFERRAL" }, _sum: { amount: true } }),
  ]);
  const link = `${process.env.SITE_URL || ""}/signup?ref=${code}`;
  const msg = encodeURIComponent(`Book flights, hotels, trains, buses & cabs on Intube Trip. Sign up with my code ${code} and get ${inr(REFERRAL_BONUS)} in your wallet: ${link}`);
  return (
    <>
      <PageTitle title="Refer & Earn" subtitle={`Invite friends. They get ${inr(REFERRAL_BONUS)} on signup, you get ${inr(REFERRAL_BONUS)} when they complete their first trip.`} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="card grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow">Your referral code</p>
            <p className="mt-1 text-3xl font-bold tracking-widest text-brand-900" data-testid="ref-code">{code}</p>
            <p className="mt-2 break-all text-sm text-slate-500">{link}</p>
            <CopyCode code={code} />
          </div>
          <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noreferrer" className="btn-primary"><Share2 className="h-4 w-4" /> Share on WhatsApp</a>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [Users, "Friends joined", String(joined)],
            [Wallet, "Earned so far", inr(earned._sum.amount ?? 0)],
            [Gift, "Per friend", inr(REFERRAL_BONUS)],
          ].map(([I, t, v]) => {
            const Icon = I as typeof Gift;
            return (
              <div key={t as string} className="card p-5">
                <Icon className="h-6 w-6 text-accent-500" />
                <p className="mt-2 text-sm text-slate-500">{t as string}</p>
                <p className="text-2xl font-bold text-brand-950">{v as string}</p>
              </div>
            );
          })}
        </div>
        <ol className="card list-inside list-decimal space-y-2 p-6 text-sm text-slate-600">
          <li>Share your code or link with friends and family.</li>
          <li>They sign up with your code and instantly get {inr(REFERRAL_BONUS)} in their wallet.</li>
          <li>When they complete their first paid booking, {inr(REFERRAL_BONUS)} is added to your wallet.</li>
        </ol>
      </div>
    </>
  );
}
