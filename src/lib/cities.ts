import { cache } from "react";
import { prisma } from "./db";

export type CityOpt = { code: string; name: string; state: string; country: string; airport: string | null; station: string | null };

export const getCities = cache(async (): Promise<CityOpt[]> =>
  prisma.city.findMany({
    select: { code: true, name: true, state: true, country: true, airport: true, station: true },
    orderBy: [{ popular: "desc" }, { name: "asc" }],
  }),
);
