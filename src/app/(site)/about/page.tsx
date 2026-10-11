import { StaticPage } from "@/components/StaticPage";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "About us" };

export default async function Page() {
  const s = await getSettings();
  return <StaticPage title={`About ${s.siteName}`} subtitle={s.tagline} sections={[
    ["Who we are", `${s.siteName} is a one-stop travel platform by Intube Media. We help millions of Indians plan and book flights, hotels, holiday packages, trains, buses and cabs at the best prices.`],
    ["Our promise", "Transparent pricing with no hidden charges, instant e-tickets, easy online cancellation with refunds straight to your wallet, and 24×7 customer support."],
    ["Contact", `${s.address}\nPhone: ${s.supportPhone}\nEmail: ${s.supportEmail}`],
  ]} />;
}
