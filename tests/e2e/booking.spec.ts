import { test, expect } from "@playwright/test";
import { day, signup, fillTravellers, payWith } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("customer booking journeys", () => {
  let email = "";
  test.beforeEach(async ({ page }, info) => {
    if (!email) email = await signup(page, "cust");
    else {
      await page.goto("/login");
      await page.fill("#email", email);
      await page.fill("#password", "secret123");
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForURL((u) => !u.pathname.startsWith("/login"));
    }
    info.annotations.push({ type: "user", description: email });
  });

  test("home page shows all six services and offers", async ({ page }) => {
    await page.goto("/");
    for (const t of ["Flights", "Hotels", "Holidays", "Trains", "Buses", "Cabs"]) await expect(page.getByRole("button", { name: t }).first()).toBeVisible();
    await expect(page.getByText("Offers for you")).toBeVisible();
  });

  test("flight: search, filter, coupon, UPI pay, e-ticket, cancel with refund", async ({ page }) => {
    await page.goto(`/flights?from=DEL&to=BOM&date=${day(10)}&ad=1&cls=ECONOMY`);
    await expect(page.getByTestId("flight-card").first()).toBeVisible();
    const all = await page.getByTestId("flight-card").count();
    await page.goto(`/flights?from=DEL&to=BOM&date=${day(10)}&ad=1&cls=ECONOMY&refundable=1`);
    expect(await page.getByTestId("flight-card").count()).toBeLessThanOrEqual(all);
    await page.getByTestId("flight-book").first().click();
    await fillTravellers(page);
    const before = await page.getByTestId("total").innerText();
    await page.getByLabel("Coupon code").fill("WELCOME");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/WELCOME/).first()).toBeVisible();
    await expect(page.getByTestId("total")).not.toHaveText(before);
    await page.getByTestId("continue-pay").click();
    const ref = await payWith(page, "UPI");
    expect(ref).toMatch(/^[A-Z]{2}/);
    await expect(page.getByTestId("pnr")).not.toBeEmpty();
    await page.getByTestId("cancel-open").click();
    await page.getByTestId("cancel-confirm").click();
    await expect(page.getByTestId("booking-cancelled")).toBeVisible();
    await expect(page.getByTestId("refund")).toContainText("₹");
  });

  test("invalid coupon is rejected", async ({ page }) => {
    await page.goto(`/flights?from=DEL&to=BOM&date=${day(12)}`);
    await page.getByTestId("flight-book").first().click();
    await page.getByLabel("Coupon code").fill("NOTREAL");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/Invalid coupon/i)).toBeVisible();
  });

  test("round-trip flight selects outbound then return", async ({ page }) => {
    await page.goto(`/flights?from=DEL&to=BOM&date=${day(14)}&ret=${day(18)}`);
    await page.getByTestId("flight-book").first().click();
    await expect(page.getByTestId("flight-card").first()).toBeVisible();
    await page.getByTestId("flight-book").first().click();
    await fillTravellers(page);
    await expect(page.getByText(/Return/i).first()).toBeVisible();
    await page.getByTestId("continue-pay").click();
    await payWith(page, "CARD");
  });

  test("hotel: filters, room selection, card payment", async ({ page }) => {
    await page.goto(`/hotels?city=GOI&in=${day(20)}&out=${day(22)}&rooms=1&guests=2`);
    await expect(page.getByTestId("hotel-card").first()).toBeVisible();
    await page.goto(`/hotels?city=GOI&in=${day(20)}&out=${day(22)}&rooms=1&guests=2&stars=5`);
    await page.getByTestId("hotel-card").first().click();
    await expect(page.getByTestId("room-card").first()).toBeVisible();
    await page.getByTestId("room-book").first().click();
    await fillTravellers(page);
    await page.getByTestId("continue-pay").click();
    await payWith(page, "CARD");
    await expect(page.getByText(/Check-in/i).first()).toBeVisible();
  });

  test("holiday package booking with net banking", async ({ page }) => {
    await page.goto("/holidays");
    await page.getByTestId("package-card").first().click();
    await expect(page.getByText(/Itinerary/i).first()).toBeVisible();
    await page.getByTestId("holiday-book").click();
    await fillTravellers(page);
    await page.getByTestId("continue-pay").click();
    await payWith(page, "NETBANKING");
  });

  test("train class booking and PNR status", async ({ page }) => {
    await page.goto(`/trains?from=DEL&to=JAI&date=${day(9)}&pax=2`);
    await expect(page.getByTestId("train-card").first()).toBeVisible();
    await page.locator('[data-testid="train-class"]:not([aria-disabled="true"])').first().click();
    await fillTravellers(page);
    expect(await page.locator('input[name$="_name"]').count()).toBe(2);
    await page.getByTestId("continue-pay").click();
    await payWith(page, "UPI");
    const pnr = (await page.getByTestId("pnr").innerText()).trim();
    await page.goto("/trains/pnr");
    await page.locator('input[name="pnr"]').fill(pnr);
    await page.getByRole("button", { name: /Check/i }).click();
    await expect(page.getByText(/CNF|Confirmed/i).first()).toBeVisible();
  });

  test("bus seat selection and booking", async ({ page }) => {
    await page.goto(`/buses?from=DEL&to=JAI&date=${day(8)}`);
    await expect(page.getByTestId("bus-card").first()).toBeVisible();
    await page.getByTestId("bus-select").first().click();
    const seats = page.locator('[data-testid^="seat-"]:not([disabled])');
    await seats.nth(0).click();
    await seats.nth(1).click();
    await page.getByTestId("bus-continue").click();
    await fillTravellers(page);
    expect(await page.locator('input[name$="_name"]').count()).toBe(2);
    await page.getByTestId("continue-pay").click();
    await payWith(page, "UPI");
  });

  test("cab booking (one way)", async ({ page }) => {
    await page.goto(`/cabs?trip=ONEWAY&from=DEL&to=JAI&date=${day(6)}&time=09:00`);
    await expect(page.getByTestId("cab-card").first()).toBeVisible();
    await page.getByTestId("cab-book").first().click();
    await fillTravellers(page);
    await page.getByTestId("continue-pay").click();
    await payWith(page, "UPI");
  });

  test("wallet top-up then fully wallet-paid booking", async ({ page }) => {
    await page.goto("/wallet");
    await page.getByTestId("topup-amount").fill("20000");
    await page.getByTestId("topup-btn").click();
    await expect(page.getByText(/added|credited/i).first()).toBeVisible();
    await page.goto(`/cabs?trip=AIRPORT&from=DEL&date=${day(5)}&time=10:00`);
    await page.getByTestId("cab-book").first().click();
    await fillTravellers(page);
    await page.locator('input[name="useWallet"]').check();
    await expect(page.getByTestId("total")).toHaveText("₹0");
    await page.getByTestId("continue-pay").click();
    await page.waitForURL(/\/my-trips\/[A-Z0-9-]+/);
    await expect(page.getByTestId("booking-confirmed")).toBeVisible();
  });

  test("my trips lists bookings in tabs", async ({ page }) => {
    await page.goto("/my-trips");
    await expect(page.getByTestId("trip-row").first()).toBeVisible();
    await page.getByRole("link", { name: /Cancelled/ }).click();
    await expect(page.getByTestId("trip-row").first()).toBeVisible();
  });

  test("wishlist, review and account pages", async ({ page }) => {
    await page.goto("/hotels?city=GOI");
    await page.getByTestId("hotel-card").first().click();
    await page.getByRole("button", { name: /wishlist/i }).first().click();
    await page.goto("/wishlist");
    await expect(page.getByText(/Goa/).first()).toBeVisible();
    await page.goto("/account");
    await expect(page.getByText("Rahul Sharma").first()).toBeVisible();
  });
});

test("guest is redirected to login when booking", async ({ page }) => {
  await page.goto(`/book/cab?cab=x&trip=AIRPORT&from=DEL&date=${day(5)}&time=10:00`);
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "nobody@example.com");
  await page.fill("#password", "wrongpass");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();
});
