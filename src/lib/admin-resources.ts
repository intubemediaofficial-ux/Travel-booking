export type FieldType = "text" | "number" | "bool" | "textarea" | "list" | "json" | "select" | "ref" | "date" | "time";
export type Field = { name: string; label: string; type: FieldType; options?: string[]; ref?: { model: string; label: string }; required?: boolean; help?: string };
export type Resource = {
  key: string; model: string; title: string; singular: string;
  columns: { name: string; label: string; fmt?: "inr" | "bool" | "date" | "list" }[];
  fields: Field[];
  search?: string[];
  include?: Record<string, boolean>;
  orderBy?: Record<string, "asc" | "desc">;
  link?: (row: Record<string, unknown>) => string | null;
};

const city = (name: string, label: string): Field => ({ name, label, type: "ref", ref: { model: "city", label: "name" }, required: true });
const SVC = ["ALL", "FLIGHT", "HOTEL", "HOLIDAY", "TRAIN", "BUS", "CAB"];

export const RESOURCES: Resource[] = [
  {
    key: "flights", model: "flight", title: "Flights", singular: "Flight", search: ["flightNo"], include: { airline: true, fromCity: true, toCity: true }, orderBy: { flightNo: "asc" },
    columns: [{ name: "flightNo", label: "Flight" }, { name: "airline.name", label: "Airline" }, { name: "fromCity.code", label: "From" }, { name: "toCity.code", label: "To" }, { name: "departTime", label: "Dep" }, { name: "economyFare", label: "Economy", fmt: "inr" }, { name: "seats", label: "Seats" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "flightNo", label: "Flight number", type: "text", required: true },
      { name: "airlineId", label: "Airline", type: "ref", ref: { model: "airline", label: "name" }, required: true },
      city("fromCityId", "From city"), city("toCityId", "To city"),
      { name: "departTime", label: "Departure time", type: "time", required: true },
      { name: "durationMins", label: "Duration (minutes)", type: "number", required: true },
      { name: "stops", label: "Stops", type: "number" }, { name: "stopCity", label: "Stop city", type: "text" },
      { name: "days", label: "Operating days (1=Mon … 7=Sun)", type: "text", help: "e.g. 1234567" },
      { name: "economyFare", label: "Economy fare ₹", type: "number", required: true }, { name: "premiumFare", label: "Premium fare ₹", type: "number", required: true }, { name: "businessFare", label: "Business fare ₹", type: "number", required: true },
      { name: "seats", label: "Seats", type: "number" }, { name: "baggage", label: "Baggage", type: "text" },
      { name: "refundable", label: "Refundable", type: "bool" }, { name: "meal", label: "Free meal", type: "bool" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "airlines", model: "airline", title: "Airlines", singular: "Airline", search: ["name", "code"], orderBy: { name: "asc" },
    columns: [{ name: "name", label: "Name" }, { name: "code", label: "Code" }, { name: "color", label: "Colour" }],
    fields: [{ name: "name", label: "Name", type: "text", required: true }, { name: "code", label: "IATA code", type: "text", required: true }, { name: "color", label: "Brand colour", type: "text" }],
  },
  {
    key: "hotels", model: "hotel", title: "Hotels", singular: "Hotel", search: ["name", "locality"], include: { city: true }, orderBy: { name: "asc" }, link: (r) => `/hotels/${r.slug}`,
    columns: [{ name: "name", label: "Name" }, { name: "city.name", label: "City" }, { name: "stars", label: "Stars" }, { name: "rating", label: "Rating" }, { name: "featured", label: "Featured", fmt: "bool" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true }, { name: "slug", label: "URL slug (auto if blank)", type: "text" }, city("cityId", "City"),
      { name: "type", label: "Type", type: "select", options: ["Hotel", "Resort", "Villa", "Homestay", "Boutique", "Hostel"] },
      { name: "address", label: "Address", type: "text", required: true }, { name: "locality", label: "Locality", type: "text" },
      { name: "stars", label: "Stars", type: "number" }, { name: "rating", label: "Rating (0–5)", type: "number" }, { name: "reviewCount", label: "Review count", type: "number" },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "amenities", label: "Amenities (one per line)", type: "list" }, { name: "images", label: "Image URLs (one per line)", type: "list" },
      { name: "checkIn", label: "Check-in time", type: "time" }, { name: "checkOut", label: "Check-out time", type: "time" }, { name: "policies", label: "Policies", type: "textarea" },
      { name: "featured", label: "Featured on home", type: "bool" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "rooms", model: "room", title: "Hotel rooms", singular: "Room", search: ["name"], include: { hotel: true }, orderBy: { price: "asc" },
    columns: [{ name: "hotel.name", label: "Hotel" }, { name: "name", label: "Room" }, { name: "price", label: "Price/night", fmt: "inr" }, { name: "maxGuests", label: "Max guests" }, { name: "inventory", label: "Inventory" }, { name: "freeCancel", label: "Free cancel", fmt: "bool" }],
    fields: [
      { name: "hotelId", label: "Hotel", type: "ref", ref: { model: "hotel", label: "name" }, required: true }, { name: "name", label: "Room name", type: "text", required: true },
      { name: "price", label: "Base price/night ₹", type: "number", required: true }, { name: "maxGuests", label: "Max guests", type: "number" }, { name: "bed", label: "Bed", type: "text" }, { name: "size", label: "Size", type: "text" },
      { name: "amenities", label: "Amenities (one per line)", type: "list" }, { name: "breakfast", label: "Breakfast included", type: "bool" }, { name: "freeCancel", label: "Free cancellation", type: "bool" },
      { name: "inventory", label: "Rooms available", type: "number" }, { name: "image", label: "Image URL", type: "text" },
    ],
  },
  {
    key: "packages", model: "package", title: "Holiday packages", singular: "Package", search: ["title", "category"], include: { city: true }, orderBy: { title: "asc" }, link: (r) => `/holidays/${r.slug}`,
    columns: [{ name: "title", label: "Title" }, { name: "city.name", label: "Destination" }, { name: "category", label: "Theme" }, { name: "nights", label: "Nights" }, { name: "price", label: "Price", fmt: "inr" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true }, { name: "slug", label: "URL slug (auto if blank)", type: "text" }, city("cityId", "Destination"),
      { name: "category", label: "Theme", type: "select", options: ["Family", "Honeymoon", "Adventure", "Beach", "Heritage", "Pilgrimage", "International", "Hill Station"] },
      { name: "nights", label: "Nights", type: "number", required: true }, { name: "price", label: "Price per adult ₹", type: "number", required: true }, { name: "originalPrice", label: "Original price ₹", type: "number" },
      { name: "images", label: "Image URLs (one per line)", type: "list" }, { name: "highlights", label: "Highlights (one per line)", type: "list" },
      { name: "inclusions", label: "Inclusions (one per line)", type: "list" }, { name: "exclusions", label: "Exclusions (one per line)", type: "list" },
      { name: "itinerary", label: "Itinerary JSON", type: "json", help: '[{"day":1,"title":"Arrival","desc":"..."}]' },
      { name: "featured", label: "Featured on home", type: "bool" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "trains", model: "train", title: "Trains", singular: "Train", search: ["name", "number"], include: { fromCity: true, toCity: true }, orderBy: { number: "asc" },
    columns: [{ name: "number", label: "No." }, { name: "name", label: "Name" }, { name: "fromCity.code", label: "From" }, { name: "toCity.code", label: "To" }, { name: "departTime", label: "Dep" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "number", label: "Train number", type: "text", required: true }, { name: "name", label: "Train name", type: "text", required: true }, city("fromCityId", "From"), city("toCityId", "To"),
      { name: "departTime", label: "Departure time", type: "time", required: true }, { name: "durationMins", label: "Duration (minutes)", type: "number", required: true },
      { name: "days", label: "Operating days (1=Mon … 7=Sun)", type: "text" },
      { name: "classes", label: "Classes JSON", type: "json", help: '[{"code":"SL","name":"Sleeper","fare":450,"seats":72}]' },
      { name: "pantry", label: "Pantry car", type: "bool" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "buses", model: "bus", title: "Buses", singular: "Bus", search: ["operator", "busType"], include: { fromCity: true, toCity: true }, orderBy: { departTime: "asc" },
    columns: [{ name: "operator", label: "Operator" }, { name: "busType", label: "Type" }, { name: "fromCity.code", label: "From" }, { name: "toCity.code", label: "To" }, { name: "departTime", label: "Dep" }, { name: "fare", label: "Fare", fmt: "inr" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "operator", label: "Operator", type: "text", required: true }, { name: "busType", label: "Bus type", type: "text", required: true }, { name: "sleeper", label: "Sleeper", type: "bool" },
      city("fromCityId", "From"), city("toCityId", "To"), { name: "departTime", label: "Departure time", type: "time", required: true }, { name: "durationMins", label: "Duration (minutes)", type: "number", required: true },
      { name: "fare", label: "Fare ₹", type: "number", required: true }, { name: "seats", label: "Seats", type: "number" },
      { name: "boarding", label: "Boarding points (one per line)", type: "list" }, { name: "dropping", label: "Dropping points (one per line)", type: "list" }, { name: "amenities", label: "Amenities (one per line)", type: "list" },
      { name: "rating", label: "Rating", type: "number" }, { name: "days", label: "Operating days", type: "text" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "cabs", model: "cabType", title: "Cab types", singular: "Cab type", search: ["name"], orderBy: { perKm: "asc" },
    columns: [{ name: "name", label: "Name" }, { name: "models", label: "Models" }, { name: "seats", label: "Seats" }, { name: "perKm", label: "₹/km" }, { name: "baseFare", label: "Base", fmt: "inr" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true }, { name: "models", label: "Models", type: "text", required: true }, { name: "seats", label: "Seats", type: "number", required: true }, { name: "bags", label: "Bags", type: "number" },
      { name: "perKm", label: "Per km ₹", type: "number", required: true }, { name: "baseFare", label: "Base fare ₹", type: "number", required: true }, { name: "ac", label: "AC", type: "bool" }, { name: "image", label: "Image URL", type: "text" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "coupons", model: "coupon", title: "Coupons & offers", singular: "Coupon", search: ["code", "title"], orderBy: { createdAt: "desc" },
    columns: [{ name: "code", label: "Code" }, { name: "title", label: "Title" }, { name: "appliesTo", label: "Applies to" }, { name: "value", label: "Value" }, { name: "usedCount", label: "Used" }, { name: "validTill", label: "Valid till", fmt: "date" }, { name: "active", label: "Active", fmt: "bool" }],
    fields: [
      { name: "code", label: "Code", type: "text", required: true }, { name: "title", label: "Title", type: "text", required: true }, { name: "description", label: "Description", type: "textarea", required: true },
      { name: "kind", label: "Discount type", type: "select", options: ["PERCENT", "FLAT"] }, { name: "value", label: "Value (% or ₹)", type: "number", required: true }, { name: "maxDiscount", label: "Max discount ₹", type: "number" },
      { name: "minAmount", label: "Min booking ₹", type: "number" }, { name: "appliesTo", label: "Applies to", type: "select", options: SVC }, { name: "validTill", label: "Valid till", type: "date" },
      { name: "usageLimit", label: "Usage limit", type: "number" }, { name: "image", label: "Banner image URL", type: "text" }, { name: "showAsOffer", label: "Show on offers page", type: "bool" }, { name: "active", label: "Active", type: "bool" },
    ],
  },
  {
    key: "cities", model: "city", title: "Cities", singular: "City", search: ["name", "code"], orderBy: { name: "asc" },
    columns: [{ name: "name", label: "Name" }, { name: "code", label: "Code" }, { name: "state", label: "State" }, { name: "country", label: "Country" }, { name: "popular", label: "Popular", fmt: "bool" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true }, { name: "code", label: "Code (IATA)", type: "text", required: true }, { name: "state", label: "State", type: "text", required: true }, { name: "country", label: "Country", type: "text" },
      { name: "airport", label: "Airport name", type: "text" }, { name: "station", label: "Railway station", type: "text" }, { name: "lat", label: "Latitude", type: "number", required: true }, { name: "lng", label: "Longitude", type: "number", required: true },
      { name: "image", label: "Image URL", type: "text" }, { name: "popular", label: "Popular destination", type: "bool" },
    ],
  },
  {
    key: "reviews", model: "review", title: "Reviews", singular: "Review", search: ["comment"], include: { hotel: true, user: true }, orderBy: { createdAt: "desc" },
    columns: [{ name: "hotel.name", label: "Hotel" }, { name: "user.name", label: "User" }, { name: "rating", label: "Rating" }, { name: "comment", label: "Comment" }, { name: "approved", label: "Approved", fmt: "bool" }],
    fields: [{ name: "rating", label: "Rating", type: "number" }, { name: "title", label: "Title", type: "text" }, { name: "comment", label: "Comment", type: "textarea" }, { name: "approved", label: "Approved", type: "bool" }],
  },
  {
    key: "enquiries", model: "enquiry", title: "Enquiries", singular: "Enquiry", search: ["name", "email", "phone", "subject"], orderBy: { createdAt: "desc" },
    columns: [{ name: "createdAt", label: "Date", fmt: "date" }, { name: "name", label: "Name" }, { name: "phone", label: "Phone" }, { name: "subject", label: "Subject" }, { name: "status", label: "Status" }],
    fields: [{ name: "name", label: "Name", type: "text" }, { name: "email", label: "Email", type: "text" }, { name: "phone", label: "Phone", type: "text" }, { name: "subject", label: "Subject", type: "text" }, { name: "message", label: "Message", type: "textarea" }, { name: "status", label: "Status", type: "select", options: ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] }],
  },
];

export const resourceByKey = (k: string) => RESOURCES.find((r) => r.key === k);
export const ADMIN_MODELS = new Set(RESOURCES.map((r) => r.model));
