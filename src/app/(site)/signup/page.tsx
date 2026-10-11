import { SignupForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Create your account" subtitle="Sign up in 30 seconds and start booking">
      <SignupForm next={sp.next ?? "/"} />
    </AuthShell>
  );
}
