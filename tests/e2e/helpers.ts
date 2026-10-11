import { expect, type Page } from "@playwright/test";

export const day = (n: number) => {
  const d = new Date(Date.now() + 5.5 * 3600_000 + n * 864e5);
  return d.toISOString().slice(0, 10);
};

export async function signup(page: Page, tag: string) {
  const email = `e2e-${tag}-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill("#name", "Rahul Sharma");
  await page.fill("#email", email);
  await page.fill("#phone", "9876543210");
  await page.fill("#password", "secret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signup"));
  return email;
}

export async function login(page: Page, email: string, password: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function fillTravellers(page: Page) {
  await page.waitForSelector('[data-testid="continue-pay"]');
  const names = page.locator('input[name$="_name"]');
  const n = await names.count();
  for (let i = 0; i < n; i++) {
    await names.nth(i).fill(`Passenger ${String.fromCharCode(65 + i)} Kumar`);
    const age = page.locator(`input[name="t${i}_age"]`);
    if (await age.count()) await age.fill(String(30 + i));
  }
  const pickup = page.locator('input[name="pickup"]');
  if (await pickup.count()) await pickup.fill("12 MG Road, near Metro Station");
}

export async function payWith(page: Page, method: "UPI" | "CARD" | "NETBANKING" = "UPI") {
  await page.waitForURL(/\/pay\//);
  await expect(page.getByTestId("timer")).toBeVisible();
  if (method === "UPI") {
    await page.getByTestId("upi").fill("rahul@okhdfc");
  } else if (method === "CARD") {
    await page.getByRole("button", { name: /Credit \/ Debit card/ }).click();
    await page.fill('input[name="card"]', "4111 1111 1111 1111");
    await page.fill('input[name="exp"]', "12/30");
    await page.fill('input[name="cvv"]', "123");
    await page.fill('input[name="cardName"]', "Rahul Sharma");
  } else {
    await page.getByRole("button", { name: /Net banking/ }).click();
    await page.locator('input[name="bank"]').first().check();
  }
  await page.getByTestId("pay-now").click();
  await page.waitForURL(/\/my-trips\/[A-Z0-9-]+/);
  await expect(page.getByTestId("booking-confirmed")).toBeVisible();
  return (await page.getByTestId("booking-ref").innerText()).trim();
}
