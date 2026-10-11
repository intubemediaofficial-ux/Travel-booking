import { test, expect } from "@playwright/test";
import { login, signup } from "./helpers";

const ADMIN = process.env.ADMIN_EMAIL || "intubemediaofficial@gmail.com";
const PASS = process.env.ADMIN_PASSWORD || "";

test.describe("admin panel", () => {
  test.skip(!PASS, "ADMIN_PASSWORD not set");

  test("non-admin cannot open admin", async ({ page }) => {
    await signup(page, "noadmin");
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("dashboard, bookings, users and every inventory screen load", async ({ page }) => {
    await login(page, ADMIN, PASS, "/admin");
    await expect(page.getByTestId("admin-stats")).toBeVisible();
    await page.goto("/admin/bookings");
    await expect(page.getByTestId("bookings-table")).toBeVisible();
    await page.goto("/admin/users");
    await expect(page.getByTestId("users-table")).toBeVisible();
    for (const r of ["flights", "airlines", "hotels", "rooms", "packages", "trains", "buses", "cabs", "coupons", "cities", "enquiries", "reviews"]) {
      await page.goto(`/admin/r/${r}`);
      await expect(page.getByTestId("resource-table")).toBeVisible();
    }
    await page.goto("/admin/settings");
    await expect(page.getByRole("button", { name: "Save settings" })).toBeVisible();
  });

  test("create, edit and deactivate a coupon; it shows on offers", async ({ page }) => {
    await login(page, ADMIN, PASS, "/admin");
    const code = `E2E${Date.now().toString(36).toUpperCase()}`;
    await page.goto("/admin/r/coupons/new");
    await page.fill("#code", code);
    await page.fill("#title", "E2E test offer");
    await page.fill("#description", "Created by automated test");
    await page.fill("#value", "15");
    await page.getByTestId("resource-save").click();
    await expect(page.getByText("Saved successfully")).toBeVisible();
    await page.goto("/offers");
    await expect(page.getByText(code)).toBeVisible();
    await page.goto(`/admin/r/coupons?q=${code}`);
    await page.getByTestId("row-edit").first().click();
    await page.fill("#title", "E2E test offer edited");
    await page.locator('input[name="active"]').uncheck();
    await page.getByTestId("resource-save").click();
    await expect(page.getByText("Saved successfully")).toBeVisible();
    await page.goto("/offers");
    await expect(page.getByText(code)).toHaveCount(0);
  });

  test("admin can confirm, complete and inspect a booking", async ({ page }) => {
    await login(page, ADMIN, PASS, "/admin");
    await page.goto("/admin/bookings?status=CONFIRMED");
    const first = page.locator('[data-testid="bookings-table"] tbody tr a').first();
    if (await first.count()) {
      await first.click();
      await expect(page.getByText(/Travellers/)).toBeVisible();
      await page.getByRole("button", { name: "Mark completed" }).click();
      await expect(page.getByText("COMPLETED").first()).toBeVisible();
    }
  });
});
