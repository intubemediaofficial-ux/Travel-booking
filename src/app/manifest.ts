import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Intube Trip",
    short_name: "Intube Trip",
    description: "Flights, hotels, trains, buses, cabs and holidays",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe4",
    theme_color: "#041b19",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
