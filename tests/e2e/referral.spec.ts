import { test, expect } from "@playwright/test";
import { signup } from "./helpers";

test.describe("refer & earn", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");
  test("referral code gives the new user a wallet bonus; bad codes are rejected", async ({ browser }) => {
    const a = await browser.newPage();
    await signup(a, "referrer");
    await a.goto("/refer");
    const code = (await a.getByTestId("ref-code").textContent())!.trim();
    expect(code).toMatch(/^[A-Z0-9]{6,}$/);

    const b = await browser.newPage();
    await b.goto("/signup?ref=NOPE123");
    await b.fill("#name", "Bad Ref");
    await b.fill("#email", `e2e-badref-${Date.now()}@example.com`);
    await b.fill("#phone", "9876543210");
    await b.fill("#password", "secret123");
    await b.getByRole("button", { name: "Create account" }).click();
    await expect(b.getByText("This referral code is not valid")).toBeVisible();

    await b.goto(`/signup?ref=${code}`);
    await expect(b.locator("#ref")).toHaveValue(code);
    await b.fill("#name", "Friend One");
    await b.fill("#email", `e2e-friend-${Date.now()}@example.com`);
    await b.fill("#phone", "9876543210");
    await b.fill("#password", "secret123");
    await b.getByRole("button", { name: "Create account" }).click();
    await b.waitForURL((u) => !u.pathname.startsWith("/signup"));
    await b.goto("/wallet");
    await expect(b.getByText(/Welcome bonus/).first()).toBeVisible();

    await a.goto("/refer");
    await expect(a.getByText("Friends joined").locator("..")).toContainText("1");
  });
});
