import { getSettings } from "@/lib/settings";
import { PageTitle } from "@/components/ui";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Phone, Mail, MapPin } from "lucide-react";

export const metadata = { title: "Customer support" };

const FAQ: [string, string][] = [
  ["How do I cancel my booking?", "Go to My Trips → open the booking → Cancel booking. Refund is calculated instantly as per the fare rules and credited to your wallet or original payment method."],
  ["When will I get my refund?", "Wallet refunds are instant. Refunds to the original payment method take 5–7 working days."],
  ["Where is my e-ticket?", "Your e-ticket is emailed after payment and is always available under My Trips, where you can also print or download it."],
  ["How do I use a coupon?", "Enter the coupon code on the review page before payment. Applicable coupons are also listed there."],
  ["How do I check train PNR status?", "Use the PNR status page under Trains and enter the PNR printed on your ticket."],
];

export default async function Page() {
  const s = await getSettings();
  return (
    <>
      <PageTitle title="24×7 customer support" subtitle="We're here to help with bookings, cancellations and refunds." />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold">Frequently asked questions</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-2 text-sm text-slate-600">{a}</p></details>
          ))}
        </div>
        <aside className="space-y-4">
          <div className="card space-y-3 p-5 text-sm">
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-600" /> {s.supportPhone}</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-600" /> {s.supportEmail}</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600" /> {s.address}</p>
          </div>
          <EnquiryForm subject="Support request" title="Write to us" />
        </aside>
      </div>
    </>
  );
}
