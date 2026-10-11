import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Privacy policy" };

export default function Page() {
  return <StaticPage title="Privacy policy" sections={[
    ["Information we collect", "Name, email, mobile number, traveller details (name, age, gender) and booking history required to issue tickets and provide support."],
    ["How we use it", "To process bookings, send e-tickets and updates, process refunds, and improve our services. We never sell your personal data."],
    ["Payments", "Card and UPI payments are processed by PCI-DSS compliant payment gateways. We do not store card numbers."],
    ["Your choices", "You can update your profile, delete saved travellers, or contact support to delete your account at any time."],
  ]} />;
}
