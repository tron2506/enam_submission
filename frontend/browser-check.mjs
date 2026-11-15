import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
});
const initialSettings = await fetch("http://127.0.0.1:8000/api/overview")
  .then((r) => r.json())
  .then((r) => r.settings);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8000");
await page.waitForSelector(".summary-strip");
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
console.log(
  "DESKTOP",
  await page.locator(".event-card").count(),
  "cards",
  "overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.locator(".sidebar nav button").nth(1).click();
await page.locator(".example-tickers button").first().click();
await page.waitForSelector(".comparison-row");
console.log(
  "RESEARCH",
  await page.locator(".comparison-row").count(),
  "comparisons",
);
await page.locator(".citations button").first().click();
await page.waitForSelector(".citation-dialog");
console.log(
  "CITATION",
  await page
    .locator(".citation-dialog blockquote")
    .innerText()
    .then((s) => s.length),
);
await page.getByRole("button", { name: "Close source" }).click();
await page.screenshot({ path: "artifacts/research.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Today", exact: true }).last().click();
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
console.log(
  "MOBILE overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.locator(".event-card").first().click();
await page.waitForSelector(".detail-drawer");
await page.screenshot({ path: "artifacts/mobile-detail.png", fullPage: true });
await page.getByRole("button", { name: "Close filing" }).click();
await page
  .getByRole("button", { name: "Settings", exact: true })
  .last()
  .click();
await page.locator("input[type=number]").first().fill("7");
await page.getByRole("button", { name: "Save watch settings" }).click();
await page.waitForSelector(".alerts-view");
console.log("SETTINGS saved", await page.locator(".rules-banner").innerText());
await fetch("http://127.0.0.1:8000/api/settings", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(initialSettings),
});
console.log("BROWSER ERRORS", errors);
await browser.close();
if (errors.length) process.exitCode = 1;
