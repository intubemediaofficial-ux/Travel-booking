import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";
import { AdminTitle } from "../AdminUI";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="max-w-3xl">
      <AdminTitle title="Site settings" subtitle="Branding, contact details and homepage content" />
      <SettingsForm values={s} keys={Object.keys(DEFAULT_SETTINGS)} />
    </div>
  );
}
