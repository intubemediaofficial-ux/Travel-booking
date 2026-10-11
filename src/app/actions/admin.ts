"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resourceByKey, type Field } from "@/lib/admin-resources";
import { cancelBooking, confirmBooking } from "@/lib/booking";
import { slugify } from "@/lib/format";
import { sendMail } from "@/lib/mail";

type Delegate = {
  create: (a: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (a: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  delete: (a: { where: { id: string } }) => Promise<unknown>;
};
const model = (m: string) => (prisma as unknown as Record<string, Delegate>)[m];

function parse(f: Field, fd: FormData): unknown {
  const raw = fd.get(f.name);
  const v = raw == null ? "" : String(raw).trim();
  switch (f.type) {
    case "bool": return fd.get(f.name) === "on";
    case "number": return v === "" ? (f.required ? NaN : null) : Number(v);
    case "list": return v.split("\n").map((x) => x.trim()).filter(Boolean);
    case "json": return v === "" ? [] : JSON.parse(v);
    case "date": return v === "" ? null : new Date(`${v}T23:59:59+05:30`);
    default: return v === "" ? null : v;
  }
}

export type AdminState = { error?: string; ok?: string } | undefined;

export async function saveResourceAction(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const r = resourceByKey(String(fd.get("_res")));
  if (!r) return { error: "Unknown resource" };
  const id = String(fd.get("_id") ?? "");
  const data: Record<string, unknown> = {};
  try {
    for (const f of r.fields) {
      const v = parse(f, fd);
      if (f.required && (v == null || v === "" || (typeof v === "number" && Number.isNaN(v)))) return { error: `${f.label} is required` };
      if (typeof v === "number" && Number.isNaN(v)) return { error: `${f.label} must be a number` };
      if (v === null && ["number", "text", "time"].includes(f.type) && !f.required && id === "new") continue;
      data[f.name] = v;
    }
  } catch {
    return { error: "Invalid JSON in one of the fields" };
  }
  if ("slug" in data && !data.slug) data.slug = slugify(String(data.name ?? data.title ?? "item")) + "-" + Date.now().toString(36);
  if (typeof data.code === "string" && r.key !== "cities" && r.key !== "airlines") data.code = data.code.toUpperCase();
  try {
    if (id === "new") await model(r.model).create({ data });
    else await model(r.model).update({ where: { id }, data });
  } catch (e) {
    const msg = (e as Error).message;
    return { error: msg.includes("Unique constraint") ? "A record with the same unique value already exists" : msg.split("\n").slice(-1)[0] || "Save failed" };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/r/${r.key}?saved=1`);
}

export async function deleteResourceAction(fd: FormData) {
  await requireAdmin();
  const r = resourceByKey(String(fd.get("_res")));
  if (!r) return;
  await model(r.model).delete({ where: { id: String(fd.get("_id")) } }).catch(() => null);
  revalidatePath("/", "layout");
  redirect(`/admin/r/${r.key}`);
}

export async function toggleActiveAction(fd: FormData) {
  await requireAdmin();
  const r = resourceByKey(String(fd.get("_res")));
  const field = String(fd.get("_field") ?? "active");
  if (!r || !r.fields.some((f) => f.name === field && f.type === "bool")) return;
  await model(r.model).update({ where: { id: String(fd.get("_id")) }, data: { [field]: fd.get("_value") === "true" } });
  revalidatePath("/", "layout");
}

export async function adminBookingAction(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const ref = String(fd.get("ref"));
  const op = String(fd.get("op"));
  try {
    if (op === "cancel") {
      const amt = String(fd.get("refund") ?? "").trim();
      await cancelBooking(ref, { reason: String(fd.get("reason") || "Cancelled by admin"), refundTo: fd.get("refundTo") === "SOURCE" ? "SOURCE" : "WALLET", overrideRefund: amt === "" ? undefined : Number(amt) });
    } else if (op === "confirm") {
      await confirmBooking(ref, "Offline", String(fd.get("paymentRef") || `ADMIN-${Date.now()}`), { ignoreHold: true });
    } else if (op === "complete") {
      await prisma.booking.update({ where: { ref, status: "CONFIRMED" }, data: { status: "COMPLETED" } });
    } else if (op === "resend") {
      const b = await prisma.booking.findUniqueOrThrow({ where: { ref } });
      const ok = await sendMail(b.contactEmail, `Your booking ${b.ref}`, `<p>Hi ${b.contactName},</p><p><b>${b.title}</b><br>${b.subtitle ?? ""}</p><p>Booking ID ${b.ref} · PNR ${b.pnr ?? "-"} · Status ${b.status}</p>`);
      if (!ok) return { error: "Email service is not configured" };
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/admin/bookings/${ref}`);
  return { ok: "Done" };
}

export async function adminUserAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const me = await requireAdmin();
  const id = String(fd.get("id"));
  const op = String(fd.get("op"));
  if (id === me.id && op !== "wallet") return { error: "You cannot change your own role/status" };
  if (op === "block" || op === "unblock") await prisma.user.update({ where: { id }, data: { blocked: op === "block" } });
  else if (op === "role") await prisma.user.update({ where: { id }, data: { role: fd.get("role") === "ADMIN" ? "ADMIN" : "USER" } });
  else if (op === "wallet") {
    const amount = Math.round(Number(fd.get("amount")));
    const note = String(fd.get("note") || "Adjusted by admin");
    if (!amount) return { error: "Enter a non-zero amount" };
    const u = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (u.walletBalance + amount < 0) return { error: "Wallet cannot go negative" };
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { walletBalance: { increment: amount } } }),
      prisma.walletTxn.create({ data: { userId: id, amount, kind: amount > 0 ? "CREDIT" : "DEBIT", note } }),
    ]);
  }
  revalidatePath(`/admin/users/${id}`);
  return { ok: "Updated" };
}

export async function saveSettingsAction(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const { DEFAULT_SETTINGS } = await import("@/lib/settings");
  const value: Record<string, string> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) value[k] = String(fd.get(k) ?? "").trim();
  if (!value.siteName) return { error: "Site name is required" };
  await prisma.setting.upsert({ where: { key: "site" }, create: { key: "site", value }, update: { value } });
  revalidatePath("/", "layout");
  return { ok: "Settings saved" };
}
