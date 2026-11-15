import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/api/**", (r) => r.abort());
await page.goto("http://127.0.0.1:8000");
await page.waitForSelector(".replay-banner");
const before = await page.locator(".event-card").count();
await page.getByLabel("Digest time window").selectOption("7");
await page.waitForTimeout(500);
const after = await page.locator(".event-card").count();
console.log("REPLAY labeled; day cards", before, "week cards", after);
const routine = page.locator(".routine-toggle");
if (await routine.count()) {
  await routine.click();
  console.log(
    "ROUTINE expanded",
    await page.locator(".routine-block .event-card").count(),
  );
}
await page
  .getByRole("button", { name: "Research", exact: true })
  .last()
  .click();
await page.locator(".example-tickers button").nth(2).click();
await page.waitForSelector(".comparison-row");
console.log(
  "REPLAY research works; regenerate disabled",
  await page.getByRole("button", { name: "Refresh research" }).isDisabled(),
);
await page.screenshot({ path: "artifacts/mobile-replay.png", fullPage: true });
await browser.close();
