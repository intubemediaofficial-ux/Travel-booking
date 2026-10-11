# TripKart — Travel booking marketplace

MakeMyTrip-style travel site: flights (one-way/round-trip), hotels, holiday packages, trains (with PNR status), buses (seat map), cabs, offers/coupons, wallet, payments (Razorpay or built-in test gateway), e-tickets, My Trips, cancellation & refunds, wishlist, reviews, and a full admin panel (`/admin`).

Stack: Next.js 16 · React 19 · Tailwind v4 · Prisma 6 + PostgreSQL.

## Setup
```bash
cp .env.example .env        # fill DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD
npm ci
npx prisma db push
npm run db:seed             # cities, airlines, flights, hotels, packages, buses, trains, cabs, coupons + admin user
npm run build && npm start
```

## Tests
```bash
npm run typecheck && npm run lint
npm test                                   # unit (pricing, coupons, refunds, formatting)
E2E_BASE_URL=http://localhost:3000 npm run test:e2e   # Playwright: all booking journeys + admin + mobile
```
