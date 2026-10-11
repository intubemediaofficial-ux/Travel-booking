import { ForgotForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Forgot password" };

export default function Page() {
  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a link to reset it">
      <ForgotForm />
    </AuthShell>
  );
}
