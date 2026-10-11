import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PayForm } from "@/components/PayForm";
import { HOLD_MINUTES } from "@/lib/inventory";
import { createRazorpayOrder, razorpayEnabled } from "@/lib/payment";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/format";
import { SVC_LABEL, type Svc } from "@/lib/pricing";

export const metadata = { title: "Payment" };

export default async function Page({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireUser(`/pay/${ref}`);
  let b = await prisma.booking.findUnique({ where: { ref } });
  if (!b || b.userId !== user.id) notFound();
  if (b.status !== "PENDING_PAYMENT") redirect(`/my-trips/${ref}`);
  let rz;
  if (razorpayEnabled()) {
    if (!b.paymentRef) {
      const order = await createRazorpayOrder(b.total, b.ref);
      b = await prisma.booking.update({ where: { ref }, data: { paymentRef: order.id } });
    }
    const s = await getSettings();
    rz = { key: process.env.RAZORPAY_KEY_ID!, orderId: b.paymentRef!, name: b.contactName, email: b.contactEmail, phone: b.contactPhone, site: s.siteName };
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Payment</h1>
        <PayForm ref_={b.ref} total={b.total} expiresAt={b.createdAt.getTime() + HOLD_MINUTES * 60_000} razorpay={rz} />
      </div>
      <aside className="card h-fit p-5 lg:mt-12">
        <p className="text-xs font-bold uppercase text-accent-600">{SVC_LABEL[b.type as Svc]} booking · {b.ref}</p>
        <p className="mt-1 text-lg font-bold">{b.title}</p>
        <p className="text-sm text-slate-500">{b.subtitle}</p>
        <p className="mt-2 text-sm">Travel: <b>{fmtDateTime(b.travelDate)}</b></p>
        <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt>Base fare</dt><dd>₹{b.baseAmount.toLocaleString("en-IN")}</dd></div>
          <div className="flex justify-between"><dt>Taxes & fees</dt><dd>₹{(b.taxes + b.fee).toLocaleString("en-IN")}</dd></div>
          {b.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>− ₹{b.discount.toLocaleString("en-IN")}</dd></div>}
          {b.walletUsed > 0 && <div className="flex justify-between text-emerald-700"><dt>Wallet</dt><dd>− ₹{b.walletUsed.toLocaleString("en-IN")}</dd></div>}
          <div className="flex justify-between border-t pt-2 text-lg font-bold"><dt>To pay</dt><dd>₹{b.total.toLocaleString("en-IN")}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
