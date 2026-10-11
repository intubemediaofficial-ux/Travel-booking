import { StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Terms & conditions" };

export default function Page() {
  return <StaticPage title="Terms & conditions" sections={[
    ["Bookings", "All bookings are subject to availability and confirmation by the airline, hotel, operator or railway. Prices may change until payment is completed. Unpaid bookings are released after 15 minutes."],
    ["Cancellation & refunds", "Flights: airline charge up to ₹3,000 per traveller plus convenience fee; non-refundable fares refund only taxes; no refund within 3 hours of departure.\nHotels: free cancellation till 24 hours before check-in where marked; otherwise 50% charge.\nHolidays: 30+ days 90%, 15–29 days 50%, 7–14 days 25%, under 7 days no refund.\nTrains: flat clerkage per passenger, 25% within 48 hours, 50% within 12 hours, none within 4 hours.\nBuses: 90% refund 24+ hours before departure, 75% 12–24 hours, 50% 6–12 hours, none within 6 hours.\nCabs: free cancellation up to 6 hours before pickup, 50% thereafter."],
    ["Wallet", "Wallet balance can be used on any booking. Refunds to wallet are instant and do not expire."],
    ["Liability", "We act as an intermediary between travellers and service providers and are not liable for delays, cancellations or deficiencies of the service provider."],
  ]} />;
}
