import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
    title: { default: `${s.siteName} — ${s.tagline}`, template: `%s | ${s.siteName}` },
    description: s.heroSubtitle,
    icons: { icon: "/icon.svg" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
