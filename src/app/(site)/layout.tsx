import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileNav, WhatsAppFab } from "@/components/MobileNav";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const wa = (s.whatsapp || s.supportPhone).replace(/\D/g, "");
  return (
    <>
      <Header />
      <main className="overflow-x-clip">{children}</main>
      <Footer />
      <div className="h-16 lg:hidden" />
      <WhatsAppFab number={wa} />
      <MobileNav />
    </>
  );
}
