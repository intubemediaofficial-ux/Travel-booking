import { LoginForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Login" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Login to your account" subtitle="Access bookings, wallet and exclusive deals">
      {sp.reset && <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password updated. Please login.</p>}
      <LoginForm next={sp.next ?? "/"} />
    </AuthShell>
  );
}
