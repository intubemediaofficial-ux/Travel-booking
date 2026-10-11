import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const R = rng(42);
const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
const between = (a: number, b: number) => Math.round(a + R() * (b - a));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
};
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const CITIES = [
  { name: "New Delhi", code: "DEL", airport: "Indira Gandhi International Airport", station: "New Delhi (NDLS)", state: "Delhi", lat: 28.61, lng: 77.21, image: "/img/delhi.jpg", popular: true, description: "India's capital — Mughal monuments, bustling bazaars and street food." },
  { name: "Mumbai", code: "BOM", airport: "Chhatrapati Shivaji Maharaj International Airport", station: "Mumbai Central (MMCT)", state: "Maharashtra", lat: 19.08, lng: 72.88, image: "/img/mumbai.jpg", popular: true, description: "The city of dreams — Marine Drive, Bollywood and the Gateway of India." },
  { name: "Bengaluru", code: "BLR", airport: "Kempegowda International Airport", station: "KSR Bengaluru (SBC)", state: "Karnataka", lat: 12.97, lng: 77.59, image: "/img/bengaluru.jpg", popular: true, description: "India's garden city and tech capital with great cafes and weather." },
  { name: "Goa", code: "GOI", airport: "Dabolim Airport", station: "Madgaon (MAO)", state: "Goa", lat: 15.38, lng: 73.83, image: "/img/goa.jpg", popular: true, description: "Sun, sand and susegad — beaches, shacks and Portuguese heritage." },
  { name: "Jaipur", code: "JAI", airport: "Jaipur International Airport", station: "Jaipur Junction (JP)", state: "Rajasthan", lat: 26.91, lng: 75.79, image: "/img/jaipur.jpg", popular: true, description: "The Pink City — forts, palaces and royal Rajasthani hospitality." },
  { name: "Udaipur", code: "UDR", airport: "Maharana Pratap Airport", station: "Udaipur City (UDZ)", state: "Rajasthan", lat: 24.58, lng: 73.71, image: "/img/udaipur.jpg", popular: true, description: "City of lakes — romantic palaces on Lake Pichola." },
  { name: "Hyderabad", code: "HYD", airport: "Rajiv Gandhi International Airport", station: "Secunderabad (SC)", state: "Telangana", lat: 17.39, lng: 78.49, image: "/img/hyderabad.jpg", popular: false, description: "Charminar, biryani and the Nizams' heritage." },
  { name: "Chennai", code: "MAA", airport: "Chennai International Airport", station: "Chennai Central (MAS)", state: "Tamil Nadu", lat: 13.08, lng: 80.27, image: "/img/chennai.jpg", popular: false, description: "Gateway to South India — temples, Marina beach and filter coffee." },
  { name: "Kolkata", code: "CCU", airport: "Netaji Subhas Chandra Bose International Airport", station: "Howrah (HWH)", state: "West Bengal", lat: 22.57, lng: 88.36, image: "/img/kolkata.jpg", popular: false, description: "City of joy — Howrah bridge, colonial architecture and sweets." },
  { name: "Varanasi", code: "VNS", airport: "Lal Bahadur Shastri Airport", station: "Varanasi Junction (BSB)", state: "Uttar Pradesh", lat: 25.32, lng: 82.97, image: "/img/varanasi.jpg", popular: true, description: "The spiritual capital — Ganga aarti and ancient ghats." },
  { name: "Agra", code: "AGR", airport: "Agra Airport", station: "Agra Cantt (AGC)", state: "Uttar Pradesh", lat: 27.18, lng: 78.01, image: "/img/agra.jpg", popular: true, description: "Home of the Taj Mahal, one of the seven wonders of the world." },
  { name: "Manali", code: "KUU", airport: "Kullu Manali Airport (Bhuntar)", station: null, state: "Himachal Pradesh", lat: 32.24, lng: 77.19, image: "/img/manali.jpg", popular: true, description: "Snow-capped peaks, Solang valley and Rohtang pass adventures." },
  { name: "Shimla", code: "SLV", airport: "Shimla Airport", station: "Shimla (SML)", state: "Himachal Pradesh", lat: 31.1, lng: 77.17, image: "/img/shimla.jpg", popular: false, description: "Queen of hills — Mall Road, toy train and colonial charm." },
  { name: "Leh", code: "IXL", airport: "Kushok Bakula Rimpochee Airport", station: null, state: "Ladakh", lat: 34.15, lng: 77.58, image: "/img/leh.jpg", popular: true, description: "High passes, Pangong lake and monasteries of Ladakh." },
  { name: "Srinagar", code: "SXR", airport: "Sheikh ul-Alam International Airport", station: null, state: "Jammu & Kashmir", lat: 34.08, lng: 74.8, image: "/img/kashmir.jpg", popular: true, description: "Paradise on earth — houseboats on Dal Lake and Mughal gardens." },
  { name: "Kochi", code: "COK", airport: "Cochin International Airport", station: "Ernakulam Junction (ERS)", state: "Kerala", lat: 9.93, lng: 76.27, image: "/img/kerala.jpg", popular: true, description: "Gateway to Kerala backwaters, Munnar and Alleppey houseboats." },
  { name: "Rishikesh", code: "DED", airport: "Jolly Grant Airport (Dehradun)", station: "Yog Nagari Rishikesh (YNRK)", state: "Uttarakhand", lat: 30.09, lng: 78.27, image: "/img/rishikesh.jpg", popular: false, description: "Yoga capital of the world — rafting, Laxman Jhula and Ganga aarti." },
  { name: "Darjeeling", code: "IXB", airport: "Bagdogra Airport", station: "New Jalpaiguri (NJP)", state: "West Bengal", lat: 27.04, lng: 88.26, image: "/img/darjeeling.jpg", popular: false, description: "Tea gardens, Kanchenjunga views and the Himalayan toy train." },
  { name: "Port Blair", code: "IXZ", airport: "Veer Savarkar International Airport", station: null, state: "Andaman & Nicobar", lat: 11.62, lng: 92.73, image: "/img/andaman.jpg", popular: true, description: "Crystal clear waters of Havelock and Neil island." },
  { name: "Dubai", code: "DXB", airport: "Dubai International Airport", station: null, state: "Dubai", country: "UAE", lat: 25.2, lng: 55.27, image: "/img/dubai.jpg", popular: true, description: "Burj Khalifa, desert safari and world-class shopping." },
  { name: "Bali", code: "DPS", airport: "Ngurah Rai International Airport", station: null, state: "Bali", country: "Indonesia", lat: -8.74, lng: 115.17, image: "/img/bali.jpg", popular: true, description: "Temples, rice terraces and beach clubs of the island of gods." },
  { name: "Male", code: "MLE", airport: "Velana International Airport", station: null, state: "Maldives", country: "Maldives", lat: 4.19, lng: 73.53, image: "/img/maldives.jpg", popular: true, description: "Overwater villas and turquoise lagoons." },
  { name: "Phuket", code: "HKT", airport: "Phuket International Airport", station: null, state: "Phuket", country: "Thailand", lat: 7.88, lng: 98.39, image: "/img/thailand.jpg", popular: true, description: "Thai beaches, island hopping and nightlife." },
  { name: "Singapore", code: "SIN", airport: "Changi Airport", station: null, state: "Singapore", country: "Singapore", lat: 1.35, lng: 103.99, image: "/img/singapore.jpg", popular: true, description: "Marina Bay Sands, Sentosa and Universal Studios." },
];

const AIRLINES = [
  { name: "IndiGo", code: "6E", color: "#1b2a8f" },
  { name: "Air India", code: "AI", color: "#d7262b" },
  { name: "Akasa Air", code: "QP", color: "#f26522" },
  { name: "SpiceJet", code: "SG", color: "#e4002b" },
  { name: "Air India Express", code: "IX", color: "#c8102e" },
  { name: "Emirates", code: "EK", color: "#c8102e" },
  { name: "Singapore Airlines", code: "SQ", color: "#13286d" },
  { name: "Thai Airways", code: "TG", color: "#5c2d91" },
];

const HOTEL_IMGS = ["/img/hotel1.jpg", "/img/hotel2.jpg", "/img/hotel3.jpg", "/img/hotel4.jpg", "/img/hotel5.jpg", "/img/hotel6.jpg", "/img/hotel7.jpg", "/img/hotel8.jpg", "/img/hotel9.jpg", "/img/hotel10.jpg"];
const AMENITIES = ["Free WiFi", "Swimming Pool", "Spa", "Restaurant", "Bar", "Gym", "Parking", "Room Service", "Airport Transfer", "Power Backup", "Laundry", "Kids Play Area", "Doctor on Call", "24h Front Desk", "Air Conditioning", "Breakfast"];

async function main() {
  const existing = await prisma.city.count();
  if (existing && !force) {
    console.log("Already seeded — skipping (use --force to reset inventory).");
  } else {
    if (force) {
      await prisma.$transaction([
        prisma.bookingLine.deleteMany(), prisma.booking.deleteMany(), prisma.review.deleteMany(), prisma.wishlist.deleteMany(),
        prisma.flight.deleteMany(), prisma.room.deleteMany(), prisma.hotel.deleteMany(), prisma.package.deleteMany(),
        prisma.bus.deleteMany(), prisma.train.deleteMany(), prisma.cabType.deleteMany(), prisma.coupon.deleteMany(),
        prisma.airline.deleteMany(), prisma.city.deleteMany(),
      ]);
    }
    const cities = [];
    for (const c of CITIES) cities.push(await prisma.city.create({ data: c }));
    const by = Object.fromEntries(cities.map((c) => [c.code, c]));
    const airlines = [];
    for (const a of AIRLINES) airlines.push(await prisma.airline.create({ data: a }));
    const dom = airlines.slice(0, 5);
    const al = Object.fromEntries(airlines.map((a) => [a.code, a]));

    // Flights
    const domestic = cities.filter((c) => c.country === "India" && c.code !== "AGR");
    const hubs = ["DEL", "BOM", "BLR", "HYD", "MAA", "CCU"];
    const flights = [];
    let fno = 100;
    for (const a of domestic) for (const b of domestic) {
      if (a.id === b.id) continue;
      const hubPair = hubs.includes(a.code) && hubs.includes(b.code);
      const anyHub = hubs.includes(a.code) || hubs.includes(b.code);
      const n = hubPair ? 7 : anyHub ? 4 : 2;
      const d = dist(a, b);
      for (let i = 0; i < n; i++) {
        const airline = pick(dom);
        const stops = !anyHub || (d > 1500 && R() < 0.3) ? 1 : 0;
        const dur = Math.round(45 + d / 12 + (stops ? between(70, 160) : 0));
        const eco = Math.round((2200 + d * 3.1 + between(-400, 900) + (stops ? -500 : 0)) / 10) * 10;
        flights.push({
          flightNo: `${airline.code}-${fno++}`, airlineId: airline.id, fromCityId: a.id, toCityId: b.id,
          departTime: hhmm(between(5 * 60, 23 * 60) - (between(0, 11) * 5) % 60 + 0), durationMins: dur - (dur % 5),
          stops, stopCity: stops ? pick(hubs.filter((h) => h !== a.code && h !== b.code).map((h) => by[h].name)) : null,
          days: R() < 0.8 ? "1234567" : "1357", economyFare: Math.max(1899, eco), premiumFare: Math.round(eco * 1.6), businessFare: Math.round(eco * 3.4),
          seats: 180, baggage: airline.code === "AI" ? "25 kg check-in, 7 kg cabin" : "15 kg check-in, 7 kg cabin",
          refundable: R() < 0.75, meal: airline.code === "AI" || R() < 0.2,
        });
      }
    }
    const intl = cities.filter((c) => c.country !== "India");
    for (const dst of intl) for (const src of ["DEL", "BOM", "BLR"]) {
      const a = by[src];
      const carriers = dst.code === "DXB" ? ["EK", "6E", "AI"] : dst.code === "SIN" ? ["SQ", "AI", "6E"] : dst.code === "HKT" ? ["TG", "6E"] : dst.code === "MLE" ? ["6E", "AI"] : ["6E", "SQ"];
      const d = dist(a, dst);
      for (const code of carriers) for (const [x, y] of [[a, dst], [dst, a]]) {
        const airline = al[code];
        const eco = Math.round((6000 + d * 3.6 + between(0, 3000)) / 10) * 10;
        const stops = dst.code === "DPS" && code !== "SQ" ? 1 : 0;
        flights.push({
          flightNo: `${code}-${fno++}`, airlineId: airline.id, fromCityId: x.id, toCityId: y.id, departTime: hhmm(between(0, 23) * 60 + pick([0, 15, 30, 45])),
          durationMins: Math.round((50 + d / 12 + (stops ? 150 : 0)) / 5) * 5, stops, stopCity: stops ? "Singapore" : null, days: "1234567",
          economyFare: eco, premiumFare: Math.round(eco * 1.7), businessFare: Math.round(eco * 3.8), seats: 250, baggage: "30 kg check-in, 7 kg cabin", refundable: true, meal: true,
        });
      }
    }
    await prisma.flight.createMany({ data: flights });

    // Hotels
    const prefixes = ["The Grand", "Royal", "Heritage", "Lakeview", "Skyline", "Palm", "Sunrise", "Emerald", "Ivory", "Regal", "Orchid", "Silver Oak"];
    const suffixes = ["Palace", "Resort & Spa", "Residency", "Suites", "Retreat", "Inn", "Boutique Hotel", "Homestay", "Villas", "Grand"];
    const localities: Record<string, string[]> = {
      DEL: ["Connaught Place", "Aerocity", "Karol Bagh", "Paharganj"], BOM: ["Juhu", "Colaba", "Andheri East", "Bandra"], BLR: ["MG Road", "Whitefield", "Indiranagar", "Koramangala"],
      GOI: ["Calangute", "Baga", "Candolim", "Palolem"], JAI: ["MI Road", "C-Scheme", "Amer Road", "Malviya Nagar"], UDR: ["Lake Pichola", "Fateh Sagar", "City Palace Road"],
    };
    for (const c of cities) {
      const n = c.popular ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const suffix = suffixes[(i + c.name.length) % suffixes.length];
        const name = `${prefixes[(i * 3 + c.code.charCodeAt(0)) % prefixes.length]} ${c.name.split(" ").pop()} ${suffix}`;
        const stars = suffix === "Homestay" || suffix === "Inn" ? 3 : i % 3 === 0 ? 5 : 4;
        const type = suffix === "Homestay" ? "Homestay" : suffix === "Villas" ? "Villa" : suffix.includes("Resort") ? "Resort" : "Hotel";
        const basePrice = (c.country !== "India" ? 6000 : 1800) + stars * between(700, 1600);
        const loc = (localities[c.code] ?? ["City Centre", "Near Airport", "Old Town", "Market Area"])[i % 4] ?? "City Centre";
        const imgs = [...HOTEL_IMGS].sort(() => R() - 0.5).slice(0, 5);
        imgs.unshift(c.image!);
        const am = [...AMENITIES].sort(() => R() - 0.5).slice(0, stars + 4);
        await prisma.hotel.create({
          data: {
            name, slug: slug(`${name}-${c.code}`), cityId: c.id, type, address: `${between(1, 220)}, ${loc}, ${c.name}, ${c.state}`, locality: loc, stars,
            rating: Math.round((3.7 + R() * 1.2) * 10) / 10, reviewCount: between(80, 4200),
            description: `${name} is a ${stars}-star ${type.toLowerCase()} located in ${loc}, ${c.name}. Enjoy elegant rooms, warm hospitality and easy access to the city's top attractions. ${c.description ?? ""}`,
            amenities: am, images: imgs.slice(0, 6), featured: i === 0 && c.popular,
            policies: "Valid government photo ID required at check-in. Unmarried couples allowed. Pets not allowed. Early check-in subject to availability.",
            rooms: {
              create: [
                { name: "Deluxe Room", price: basePrice, maxGuests: 2, bed: "Queen Bed", size: "220 sq.ft", amenities: ["Free WiFi", "TV", "Air Conditioning", "Tea/Coffee Maker"], breakfast: false, freeCancel: true, inventory: 12, image: imgs[1] },
                { name: "Deluxe Room with Breakfast", price: Math.round(basePrice * 1.18), maxGuests: 2, bed: "Queen Bed", size: "220 sq.ft", amenities: ["Free WiFi", "TV", "Breakfast", "Air Conditioning"], breakfast: true, freeCancel: true, inventory: 10, image: imgs[2] },
                { name: "Premium Room", price: Math.round(basePrice * 1.45), maxGuests: 3, bed: "King Bed", size: "300 sq.ft", amenities: ["Free WiFi", "Bathtub", "Mini Bar", "Breakfast", "City View"], breakfast: true, freeCancel: R() < 0.6, inventory: 8, image: imgs[3] },
                ...(stars >= 4 ? [{ name: "Executive Suite", price: Math.round(basePrice * 2.4), maxGuests: 4, bed: "King Bed + Sofa Bed", size: "520 sq.ft", amenities: ["Living Room", "Bathtub", "Lounge Access", "Breakfast", "Butler Service"], breakfast: true, freeCancel: false, inventory: 4, image: imgs[4] }] : []),
              ],
            },
          },
        });
      }
    }

    // Packages
    const PK = [
      { title: "Magical Goa Beach Holiday", code: "GOI", category: "Beach", nights: 4, price: 15999, places: ["North Goa beaches", "Fort Aguada", "Dudhsagar falls", "South Goa churches", "Cruise on Mandovi"] },
      { title: "Royal Rajasthan — Jaipur & Udaipur", code: "JAI", category: "Heritage", nights: 5, price: 24999, places: ["Amer Fort", "City Palace Jaipur", "Drive to Udaipur", "Lake Pichola boat ride", "Saheliyon ki Bari"] },
      { title: "Kashmir Paradise Tour", code: "SXR", category: "Honeymoon", nights: 5, price: 27999, places: ["Dal Lake shikara", "Gulmarg gondola", "Pahalgam valleys", "Sonmarg glacier", "Mughal gardens"] },
      { title: "Manali Snow Adventure", code: "KUU", category: "Adventure", nights: 4, price: 13999, places: ["Hadimba temple", "Solang valley", "Atal tunnel & Sissu", "Kullu river rafting", "Old Manali cafes"] },
      { title: "Leh Ladakh Bike Expedition", code: "IXL", category: "Adventure", nights: 6, price: 32999, places: ["Acclimatisation in Leh", "Khardung La", "Nubra valley", "Pangong lake", "Magnetic hill"] },
      { title: "Kerala Backwaters & Munnar", code: "COK", category: "Family", nights: 5, price: 22999, places: ["Fort Kochi", "Munnar tea gardens", "Thekkady spice plantation", "Alleppey houseboat", "Kumarakom"] },
      { title: "Andaman Island Escape", code: "IXZ", category: "Beach", nights: 5, price: 34999, places: ["Cellular jail light show", "Havelock — Radhanagar beach", "Elephant beach snorkelling", "Neil island", "Ross island"] },
      { title: "Spiritual Varanasi & Ayodhya", code: "VNS", category: "Pilgrimage", nights: 3, price: 11999, places: ["Kashi Vishwanath", "Ganga aarti at Dashashwamedh", "Sarnath", "Sunrise boat ride"] },
      { title: "Golden Triangle — Delhi Agra Jaipur", code: "DEL", category: "Heritage", nights: 5, price: 19999, places: ["Delhi sightseeing", "Taj Mahal sunrise", "Agra fort", "Fatehpur Sikri", "Jaipur forts"] },
      { title: "Dubai Delight with Desert Safari", code: "DXB", category: "International", nights: 4, price: 49999, places: ["Dubai city tour", "Burj Khalifa 124th floor", "Desert safari with BBQ", "Dhow cruise", "Abu Dhabi day trip"] },
      { title: "Bali Honeymoon Special", code: "DPS", category: "Honeymoon", nights: 6, price: 59999, places: ["Kintamani volcano", "Ubud rice terraces", "Tanah Lot temple", "Nusa Penida", "Uluwatu sunset"] },
      { title: "Maldives Overwater Villa", code: "MLE", category: "Honeymoon", nights: 4, price: 89999, places: ["Speedboat transfer", "Snorkelling", "Sandbank picnic", "Sunset dolphin cruise"] },
      { title: "Thailand Phuket & Krabi", code: "HKT", category: "International", nights: 5, price: 42999, places: ["Phi Phi island tour", "Phuket city", "Krabi 4-island tour", "James Bond island"] },
      { title: "Singapore Family Fun", code: "SIN", category: "Family", nights: 4, price: 64999, places: ["Universal Studios", "Sentosa & S.E.A. Aquarium", "Gardens by the Bay", "Night Safari"] },
      { title: "Darjeeling & Gangtok Hills", code: "IXB", category: "Family", nights: 5, price: 21999, places: ["Tiger Hill sunrise", "Toy train joyride", "Tsomgo lake", "Gangtok MG Marg"] },
      { title: "Rishikesh Yoga & Rafting Retreat", code: "DED", category: "Adventure", nights: 3, price: 9999, places: ["Ganga rafting", "Beatles ashram", "Triveni ghat aarti", "Yoga & meditation"] },
    ];
    for (const p of PK) {
      const c = by[p.code];
      const itinerary = [{ day: 1, title: `Arrival in ${c.name}`, desc: `Meet & greet on arrival, private transfer to hotel. Evening at leisure.` }];
      for (let d = 0; d < p.nights - 1; d++) {
        const place = p.places[d % p.places.length];
        itinerary.push({ day: d + 2, title: place, desc: `After breakfast proceed for ${place}. Enjoy the experience with our local guide and return to the hotel for an overnight stay.` });
      }
      itinerary.push({ day: p.nights + 1, title: "Departure", desc: "Check out after breakfast and transfer to the airport/station with sweet memories." });
      await prisma.package.create({
        data: {
          title: p.title, slug: slug(p.title), cityId: c.id, category: p.category, nights: p.nights, price: p.price, originalPrice: Math.round(p.price * 1.25 / 100) * 100,
          images: [c.image!, ...[...HOTEL_IMGS].sort(() => R() - 0.5).slice(0, 3)], highlights: p.places,
          inclusions: ["Hotel accommodation", "Daily breakfast & dinner", "Airport / station transfers", "Sightseeing by private cab", "All taxes & toll"],
          exclusions: ["Flights / train tickets", "Lunch", "Entry tickets", "Personal expenses", "Travel insurance"],
          itinerary, featured: R() < 0.6,
        },
      });
    }

    // Buses
    const OPS = ["Zingbus", "IntrCity SmartBus", "VRL Travels", "SRS Travels", "Orange Tours", "RSRTC Volvo", "HRTC Himsuta", "Paulo Travels", "Kallada Travels", "Hans Travels"];
    const BUS_ROUTES = [["DEL", "JAI"], ["DEL", "KUU"], ["DEL", "SLV"], ["DEL", "DED"], ["DEL", "AGR"], ["JAI", "UDR"], ["JAI", "AGR"], ["BOM", "GOI"], ["BLR", "GOI"], ["BLR", "MAA"], ["BLR", "HYD"], ["MAA", "HYD"], ["BLR", "COK"], ["CCU", "IXB"], ["DEL", "VNS"], ["BOM", "UDR"], ["DEL", "UDR"], ["SXR", "IXL"]];
    const buses = [];
    for (const [x, y] of BUS_ROUTES) for (const [a, b] of [[by[x], by[y]], [by[y], by[x]]]) {
      const d = dist(a, b) * 1.3;
      for (let i = 0; i < 6; i++) {
        const sleeper = d > 350 ? R() < 0.7 : R() < 0.2;
        const ac = R() < 0.8;
        const busType = `${ac ? "A/C" : "Non A/C"} ${sleeper ? "Sleeper (2+1)" : "Seater (2+2)"}${ac && !sleeper && R() < 0.5 ? " Volvo Multi-Axle" : ""}`;
        buses.push({
          operator: pick(OPS), busType, sleeper, fromCityId: a.id, toCityId: b.id,
          departTime: d > 350 ? hhmm(between(18, 23) * 60 + pick([0, 15, 30, 45])) : hhmm(between(5, 20) * 60 + pick([0, 30])),
          durationMins: Math.round(d / 50 * 60 / 15) * 15, fare: Math.round((150 + d * (sleeper ? 2.1 : 1.5) * (ac ? 1.25 : 1)) / 10) * 10,
          seats: sleeper ? 30 : 40, boarding: [`${a.name} ISBT`, `${a.name} Bypass`, `${a.name} Railway Station`], dropping: [`${b.name} Bus Stand`, `${b.name} City Centre`],
          amenities: [...["Water Bottle", "Charging Point", "Blanket", "Reading Light", "GPS Tracking", "CCTV", "Emergency Contact"]].sort(() => R() - 0.5).slice(0, 4),
          rating: Math.round((3.6 + R() * 1.3) * 10) / 10, days: "1234567",
        });
      }
    }
    await prisma.bus.createMany({ data: buses });

    // Trains
    const withStation = cities.filter((c) => c.station);
    const trains = [];
    let tn = 12001;
    for (const a of withStation) for (const b of withStation) {
      if (a.id === b.id) continue;
      const d = dist(a, b) * 1.25;
      if (d > 2600) continue;
      const n = hubs.includes(a.code) && hubs.includes(b.code) ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const kind = d < 700 && i === 0 ? pick(["Shatabdi Express", "Vande Bharat Express"]) : i === 1 ? pick(["Rajdhani Express", "Duronto Express"]) : pick(["Superfast Express", "Mail Express", "Garib Rath", "Humsafar Express"]);
        const speed = kind.includes("Vande") ? 85 : kind.includes("Rajdhani") || kind.includes("Shatabdi") || kind.includes("Duronto") ? 75 : 58;
        const chair = kind.includes("Shatabdi") || kind.includes("Vande");
        const classes = chair
          ? [{ code: "CC", name: "AC Chair Car", fare: Math.round(150 + d * 1.6), seats: 78 * 6 }, { code: "EC", name: "Executive Chair Car", fare: Math.round(250 + d * 3.1), seats: 56 }]
          : kind.includes("Rajdhani") || kind.includes("Duronto")
            ? [{ code: "3A", name: "AC 3 Tier", fare: Math.round(300 + d * 1.6), seats: 64 * 8 }, { code: "2A", name: "AC 2 Tier", fare: Math.round(450 + d * 2.3), seats: 46 * 4 }, { code: "1A", name: "First Class AC", fare: Math.round(700 + d * 3.8), seats: 24 }]
            : [{ code: "SL", name: "Sleeper", fare: Math.round(80 + d * 0.55), seats: 72 * 10 }, { code: "3A", name: "AC 3 Tier", fare: Math.round(250 + d * 1.45), seats: 64 * 5 }, { code: "2A", name: "AC 2 Tier", fare: Math.round(400 + d * 2.1), seats: 46 * 2 }];
        trains.push({
          number: String(tn++), name: `${a.name.split(" ").pop()} ${b.name.split(" ").pop()} ${kind}`, fromCityId: a.id, toCityId: b.id,
          departTime: hhmm(between(0, 23) * 60 + pick([0, 10, 25, 40, 55])), durationMins: Math.round((d / speed) * 60 / 5) * 5,
          days: R() < 0.7 ? "1234567" : pick(["135", "246", "1357", "2467"]), classes, pantry: !chair && R() < 0.7,
        });
      }
    }
    await prisma.train.createMany({ data: trains });

    await prisma.cabType.createMany({
      data: [
        { name: "Hatchback", models: "Wagon R, Swift or similar", seats: 4, bags: 1, perKm: 11, baseFare: 299, image: "/img/cab.jpg" },
        { name: "Sedan", models: "Dzire, Etios or similar", seats: 4, bags: 2, perKm: 13, baseFare: 349, image: "/img/cab.jpg" },
        { name: "SUV", models: "Ertiga, Marazzo or similar", seats: 6, bags: 3, perKm: 16, baseFare: 449, image: "/img/cab.jpg" },
        { name: "Innova Crysta", models: "Toyota Innova Crysta", seats: 7, bags: 4, perKm: 19, baseFare: 549, image: "/img/cab.jpg" },
        { name: "Tempo Traveller", models: "Force Tempo Traveller 12-seater", seats: 12, bags: 8, perKm: 26, baseFare: 899, image: "/img/bus.jpg" },
      ],
    });

    const next = new Date(Date.now() + 365 * 86400_000);
    await prisma.coupon.createMany({
      data: [
        { code: "WELCOME", title: "Flat 12% off on your first trip", description: "Get 12% off up to ₹1,500 on any booking above ₹2,000.", kind: "PERCENT", value: 12, maxDiscount: 1500, minAmount: 2000, appliesTo: "ALL", validTill: next, image: "/img/hero2.jpg" },
        { code: "FLYNOW", title: "Flat ₹750 off on flights", description: "Book domestic or international flights worth ₹5,000+ and save ₹750.", kind: "FLAT", value: 750, minAmount: 5000, appliesTo: "FLIGHT", validTill: next, image: "/img/flight.jpg" },
        { code: "STAYMORE", title: "Up to 20% off on hotels", description: "20% off up to ₹3,000 on hotel stays above ₹3,000.", kind: "PERCENT", value: 20, maxDiscount: 3000, minAmount: 3000, appliesTo: "HOTEL", validTill: next, image: "/img/hotel3.jpg" },
        { code: "HOLIDAY10", title: "10% off holiday packages", description: "Save up to ₹10,000 on domestic & international holidays.", kind: "PERCENT", value: 10, maxDiscount: 10000, minAmount: 9000, appliesTo: "HOLIDAY", validTill: next, image: "/img/maldives.jpg" },
        { code: "BUSFEST", title: "15% off bus tickets", description: "Up to ₹300 off on bus bookings.", kind: "PERCENT", value: 15, maxDiscount: 300, minAmount: 300, appliesTo: "BUS", validTill: next, image: "/img/bus.jpg" },
        { code: "RAILYATRA", title: "₹50 off on train tickets", description: "Flat ₹50 off on train bookings above ₹500.", kind: "FLAT", value: 50, minAmount: 500, appliesTo: "TRAIN", validTill: next, image: "/img/train.jpg" },
        { code: "CABRIDE", title: "10% off outstation cabs", description: "Up to ₹400 off on one-way, round trip and airport cabs.", kind: "PERCENT", value: 10, maxDiscount: 400, minAmount: 500, appliesTo: "CAB", validTill: next, image: "/img/cab.jpg" },
      ],
    });
    console.log(`Seeded ${cities.length} cities, ${flights.length} flights, ${await prisma.hotel.count()} hotels, ${PK.length} packages, ${buses.length} buses, ${trains.length} trains.`);
  }

  const email = (process.env.ADMIN_EMAIL || "intubemediaofficial@gmail.com").toLowerCase();
  if (process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await prisma.user.upsert({ where: { email }, update: { role: "ADMIN", passwordHash }, create: { email, name: "Admin", role: "ADMIN", passwordHash } });
    console.log("Admin ready:", email);
  }
}

main().finally(() => prisma.$disconnect());
