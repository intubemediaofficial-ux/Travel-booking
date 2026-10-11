"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser, requireUser } from "@/lib/auth";
import { cancelBooking, confirmBooking, createBooking, previewCoupon, type Traveller } from "@/lib/booking";
import { RESOLVERS, BookErr } from "@/lib/resolve";
import type { Svc } from "@/lib/pricing";
import { prisma } from "@/lib/db";
import { verifyRazorpay } from "@/lib/payment";

export type BookState = { error?: string } | undefined;

export async function checkCouponAction(code: string, svc: Svc, base: number) {
  return previewCoupon(code, svc, base);
}

export async function bookAction(_: BookState, fd: FormData): Promise<BookState> {
  const user = await getUser();
  if (!user) return { error: "Please login to continue" };
  const svc = String(fd.get("svc")) as Svc;
  const resolver = RESOLVERS[svc];
  if (!resolver) return { error: "Invalid booking" };
  const params: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("p_")) params[k.slice(2)] = String(v);
  let ref = "";
  try {
    const r = await resolver(params);
    const travellers: Traveller[] = [];
    for (let i = 0; i < r.travellers; i++) {
      const name = String(fd.get(`t${i}_name`) ?? "").trim();
      const age = Number(fd.get(`t${i}_age`) ?? (r.mode === "lead" ? 30 : 0));
      const gender = String(fd.get(`t${i}_gender`) ?? "Male");
      if (name.length < 2) return { error: `Enter full name for traveller ${i + 1}` };
      if (r.mode === "full" && !(age > 0 && age < 120)) return { error: `Enter a valid age for ${name}` };
      travellers.push({ name, age, gender, ...(fd.get(`t${i}_berth`) ? { berth: String(fd.get(`t${i}_berth`)) } : {}) });
    }
    const contact = {
      name: travellers[0]?.name ?? user.name,
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
    };
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) return { error: "Enter a valid email for the e-ticket" };
    if (!/^[+]?[0-9 ]{10,15}$/.test(contact.phone)) return { error: "Enter a valid mobile number" };
    const details = { ...r.details, ...(fd.get("notes") ? { notes: String(fd.get("notes")).slice(0, 500) } : {}), ...(fd.get("pickup") ? { pickup: String(fd.get("pickup")).slice(0, 200) } : {}) };
    const b = await createBooking({
      userId: user.id, type: svc, itemId: r.itemId, title: r.title, subtitle: r.subtitle, travelDate: r.travelDate, endDate: r.endDate,
      details: details as object, travellers, seats: r.seats, contact, base: r.base, pax: r.pax, nightly: r.nightly,
      couponCode: String(fd.get("coupon") ?? ""), useWallet: fd.get("useWallet") === "on", lines: r.lines,
    });
    if (fd.get("saveTravellers") === "on" && r.mode === "full") {
      const existing = new Set((await prisma.savedTraveller.findMany({ where: { userId: user.id } })).map((t) => t.name.toLowerCase()));
      const fresh = travellers.filter((t) => !existing.has(t.name.toLowerCase()));
      if (fresh.length) await prisma.savedTraveller.createMany({ data: fresh.map((t) => ({ userId: user.id, name: t.name, age: t.age, gender: t.gender })) });
    }
    ref = b.ref;
  } catch (e) {
    if (e instanceof BookErr || e instanceof Error) return { error: e.message };
    return { error: "Something went wrong" };
  }
  const b = await prisma.booking.findUnique({ where: { ref } });
  redirect(b?.status === "CONFIRMED" ? `/my-trips/${ref}?paid=1` : `/pay/${ref}`);
}

export type PayState = { error?: string } | undefined;

export async function mockPayAction(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireUser();
  const ref = String(fd.get("ref"));
  const method = String(fd.get("method") ?? "UPI");
  const b = await prisma.booking.findUnique({ where: { ref } });
  if (!b || b.userId !== user.id) return { error: "Booking not found" };
  if (method === "UPI") {
    if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(String(fd.get("upi") ?? ""))) return { error: "Enter a valid UPI ID (e.g. name@okhdfc)" };
  } else if (method === "CARD") {
    const num = String(fd.get("card") ?? "").replace(/\s/g, "");
    if (!/^\d{12,19}$/.test(num) || !luhn(num)) return { error: "Enter a valid card number" };
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(fd.get("exp") ?? ""))) return { error: "Enter expiry as MM/YY" };
    if (!/^\d{3,4}$/.test(String(fd.get("cvv") ?? ""))) return { error: "Enter CVV" };
  } else if (method === "NETBANKING") {
    if (!fd.get("bank")) return { error: "Choose your bank" };
  }
  try {
    await confirmBooking(ref, method, `PAY${Date.now().toString(36).toUpperCase()}`);
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/my-trips/${ref}?paid=1`);
}

export async function razorpayVerifyAction(ref: string, orderId: string, paymentId: string, signature: string) {
  const user = await requireUser();
  const b = await prisma.booking.findUnique({ where: { ref } });
  if (!b || b.userId !== user.id) return { error: "Booking not found" };
  if (b.paymentRef !== orderId || !verifyRazorpay(orderId, paymentId, signature)) return { error: "Payment verification failed" };
  try {
    await confirmBooking(ref, "Razorpay", paymentId, { ignoreHold: true });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { ok: true };
}

function luhn(n: string) {
  let sum = 0;
  let dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dbl && (d *= 2) > 9) d -= 9;
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export async function cancelAction(_: BookState, fd: FormData): Promise<BookState> {
  const user = await requireUser();
  const ref = String(fd.get("ref"));
  try {
    await cancelBooking(ref, {
      userId: user.id,
      reason: String(fd.get("reason") || "Change of plans"),
      refundTo: fd.get("refundTo") === "SOURCE" ? "SOURCE" : "WALLET",
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/my-trips/${ref}`);
  redirect(`/my-trips/${ref}?cancelled=1`);
}

export async function toggleWishlistAction(fd: FormData) {
  const user = await requireUser(String(fd.get("back") ?? "/"));
  const kind = String(fd.get("kind"));
  const itemId = String(fd.get("itemId"));
  const w = await prisma.wishlist.findUnique({ where: { userId_kind_itemId: { userId: user.id, kind, itemId } } });
  if (w) await prisma.wishlist.delete({ where: { id: w.id } });
  else await prisma.wishlist.create({ data: { userId: user.id, kind, itemId } });
  revalidatePath(String(fd.get("back") ?? "/"));
}

export async function reviewAction(_: BookState, fd: FormData): Promise<BookState> {
  const user = await getUser();
  if (!user) return { error: "Please login to write a review" };
  const hotelId = String(fd.get("hotelId"));
  const rating = Number(fd.get("rating"));
  const comment = String(fd.get("comment") ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { error: "Choose a rating" };
  if (comment.length < 10) return { error: "Please write at least 10 characters" };
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) return { error: "Hotel not found" };
  await prisma.review.create({ data: { userId: user.id, hotelId, rating, title: String(fd.get("title") ?? "").slice(0, 100) || null, comment: comment.slice(0, 2000) } });
  revalidatePath(`/hotels/${hotel.slug}`);
  return undefined;
}

export async function enquiryAction(_: { error?: string; ok?: string } | undefined, fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const message = String(fd.get("message") ?? "").trim();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 10 || message.length < 5) return { error: "Please fill all fields correctly" };
  await prisma.enquiry.create({
    data: { name, email, phone, message: message.slice(0, 3000), subject: String(fd.get("subject") ?? "General enquiry").slice(0, 200), packageId: fd.get("packageId") ? String(fd.get("packageId")) : null },
  });
  return { ok: "Thank you! Our travel expert will call you shortly." };
}
