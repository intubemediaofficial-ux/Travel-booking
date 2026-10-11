import { PageTitle } from "@/components/ui";
import { PnrForm } from "@/components/PnrForm";

export const metadata = { title: "PNR status" };

export default function Page() {
  return (
    <>
      <PageTitle title="Check PNR status" subtitle="Enter the PNR from your e-ticket to see live booking status." image="/img/train.jpg" />
      <div className="mx-auto max-w-3xl px-4 py-8"><PnrForm /></div>
    </>
  );
}
