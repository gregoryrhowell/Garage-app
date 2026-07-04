// Drives the running app with a headless Chrome to capture preview screenshots.
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const browser = await puppeteer.launch({
  headless: "shell",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

async function clickByText(texts) {
  return page.evaluate((texts) => {
    const btn = [...document.querySelectorAll("button, a")].find((b) =>
      texts.includes(b.textContent.trim()),
    );
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return null;
  }, texts);
}

// 1) Import screen
await page.goto(`${BASE}/import`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.body.innerText.includes("GH Cozy"), { timeout: 8000 });
await wait(400);
await page.screenshot({ path: `${OUT}/1-import.png` });

// Run the import and wait until it routes to the meso page
const did = await clickByText(["Import"]);
log("clicked:", did);
await page.waitForFunction(() => location.pathname.startsWith("/meso/"), { timeout: 15000 });
const mesoUrl = page.url();
log("meso url:", mesoUrl);

// Wait for the meso content (week pills + day cards) to actually render
await page.waitForFunction(
  () => /Training days/.test(document.body.innerText) &&
        /Chest|Quads|Back/.test(document.body.innerText),
  { timeout: 10000 },
);
await wait(600);
await page.screenshot({ path: `${OUT}/3-meso.png`, fullPage: true });

// 2) Home screen (lists the imported meso)
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.body.innerText.includes("GH Cozy"), { timeout: 8000 });
await wait(400);
await page.screenshot({ path: `${OUT}/2-home.png` });

// 3) Open a day's session (with logged history) from the meso page
await page.goto(mesoUrl, { waitUntil: "networkidle0" });
await page.waitForFunction(
  () => [...document.querySelectorAll("button")].some((b) =>
    ["Start", "Resume", "Done"].includes(b.textContent.trim())),
  { timeout: 10000 },
);
await wait(500);
const dayBtn = await clickByText(["Done", "Resume", "Start"]);
log("day button:", dayBtn);
await page.waitForFunction(() => location.pathname.startsWith("/session/"), { timeout: 12000 });
await page.waitForFunction(() => document.querySelectorAll("input").length > 3, { timeout: 8000 });
await wait(700);
await page.screenshot({ path: `${OUT}/4-session.png`, fullPage: true });
log("session url:", page.url());

await browser.close();
log("done");
