import { prisma } from "./db";

export type SiteSettings = {
  siteName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  heroTitle: string;
  heroSubtitle: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Intube Trip",
  tagline: "Flights, Hotels, Holidays, Trains, Buses & Cabs",
  supportPhone: "+91 98765 43210",
  supportEmail: "intubemediaofficial@gmail.com",
  address: "Intube Media, Jaipur, Rajasthan, India",
  heroTitle: "Book your next trip in minutes",
  heroSubtitle: "Lowest fares on flights, handpicked hotels, holiday packages, trains, buses and cabs — all in one place.",
  whatsapp: "",
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
};

export async function getSettings(): Promise<SiteSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "site" } }).catch(() => null);
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<SiteSettings>) ?? {}) };
}
