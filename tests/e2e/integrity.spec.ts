import { test, expect } from "@playwright/test";
import { day, fillTravellers, signup } from "./helpers";

test.describe("booking integrity", () => {
  test("malformed dates and times are rejected instead of pricing at ₹0", async ({ page }) => {
    await signup(page, "integ");
    await page.goto(`/hotels?city=GOI&in=${day(20)}&out=${day(22)}&rooms=1&guests=2`);
    await page.getByTestId("hotel-card").first().click();
    await page.getByTestId("room-book").first().click();
    await page.waitForURL(/\/book\/hotel/);
    const url = new URL(page.url());
    url.searchParams.set("out", "zzzz");
    await page.goto(url.toString());
    await expect(page.getByText("This option is no longer available")).toBeVisible();
    await page.goto(`/book/cab?cab=x&trip=ONEWAY&from=DEL&to=JAI&date=${day(6)}&time=99:99`);
    await expect(page.getByText("This option is no longer available")).toBeVisible();
  });

  test("two customers racing for the same bus seat: only one gets it", async ({ browser }) => {
    const ctxs = await Promise.all([browser.newContext(), browser.newContext()]);
    const pages = await Promise.all(ctxs.map((c) => c.newPage()));
    await Promise.all(pages.map((p, i) => signup(p, `race${i}`)));
    await pages[0].goto(`/buses?from=DEL&to=JAI&date=${day(12)}`);
    await pages[0].getByTestId("bus-select").last().click();
    await pages[0].locator('[data-testid^="seat-"]:not([disabled])').first().click();
    await pages[0].getByTestId("bus-continue").click();
    await pages[0].waitForURL(/\/book\/bus/);
    await pages[1].goto(pages[0].url());
    await Promise.all(pages.map((p) => fillTravellers(p)));
    await Promise.all(pages.map((p) => p.getByTestId("continue-pay").click()));
    await Promise.all(pages.map((p) => p.waitForURL(/\/pay\//, { timeout: 8000 }).catch(() => null)));
    const onPay = pages.filter((p) => p.url().includes("/pay/")).length;
    expect(onPay).toBe(1);
    const loser = pages.find((p) => !p.url().includes("/pay/"))!;
    await expect(loser.getByText(/just got booked/)).toBeVisible();
    await Promise.all(ctxs.map((c) => c.close()));
  });
});
