import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "only light",
  themeColor: "#041b19",
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
    title: { default: `${s.siteName} — ${s.tagline}`, template: `%s | ${s.siteName}` },
    description: s.heroSubtitle,
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: s.siteName, statusBarStyle: "black-translucent" },
    other: { "color-scheme": "only light", "supported-color-schemes": "light" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable} style={{ colorScheme: "only light" }}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
