import { test, expect } from "@playwright/test";

for (const path of ["/", "/flights", "/hotels?city=GOI", "/holidays", "/trains", "/buses", "/cabs", "/offers"]) {
  test(`mobile layout has no horizontal overflow: ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
}
