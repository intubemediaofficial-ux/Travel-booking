import { ResetForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Reset password" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password">
      <ResetForm token={token} />
    </AuthShell>
  );
}
