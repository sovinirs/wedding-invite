import { chromium } from "playwright";

/* End-to-end check of the whole flow: sign up, build an invitation, then open
   the public link as a guest and scrub the film.

   Usage:  npm run dev            (note the port it prints)
           BASE=http://localhost:3000 npm run e2e                          */
const BASE = process.env.BASE ?? "http://localhost:3000";
const EMAIL = `e2e-${Date.now()}@example.com`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

const step = (s) => console.log("• " + s);

/* ---- sign up ---- */
await page.goto(BASE + "/signup");
await page.fill('input[name="name"]', "Vijay");
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', "supersecret1");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 15000 });
step("signed up → " + page.url());
step("empty state shown: " + (await page.locator("text=Nothing here yet").count() > 0));

/* ---- create an invitation ---- */
await page.click('a[href="/dashboard/new"]');
await page.waitForURL("**/dashboard/new");
await page.fill('input[name="partnerOne"]', "Vijay");
await page.fill('input[name="partnerTwo"]', "Anitha");
await page.fill('input[name="eventDate"]', "March 8, 2027");
await page.fill('input[name="venueName"]', "Lalitha Mahal");
await page.fill('textarea[name="eventTime"]', "Reception: 7:00 PM\nMuhurtham: 10:15 AM");
await page.fill('input[name="mapsUrl"]', "https://maps.google.com/?q=lalitha+mahal");
await page.click('button:has-text("Garden at Dusk")');
step("selected Garden template");
await page.click('button[type="submit"]');
await page.waitForURL(/\/dashboard\/c[a-z0-9]{20,}/, { timeout: 15000 });
step("created → " + page.url());

const share = await page.locator("code").first().innerText();
step("share link: " + share);

/* ---- slug auto-derivation + ownership check ---- */
const slug = share.split("/i/")[1];
step("slug derived: " + slug);

/* ---- visit the public invite ---- */
const guest = await browser.newContext({ viewport: { width: 430, height: 900 } });
const gp = await guest.newPage();
gp.on("pageerror", (e) => errors.push("guest pageerror: " + e.message));
await gp.goto(BASE + "/i/" + slug);

await gp.waitForSelector('button:has-text("Tap to Begin")', { timeout: 30000 });
step("film buffered → gate armed");
await gp.screenshot({ path: "shot-gate.png" });

await gp.click('button:has-text("Tap to Begin")');
await gp.waitForTimeout(1200);
step("entered; names visible: " + (await gp.locator("h1:has-text('Vijay')").count() > 0));
await gp.screenshot({ path: "shot-open.png" });

/* ---- scrub the film by scrolling ---- */
const readAt = async (fraction) => {
  await gp.evaluate((f) => {
    const el = document.querySelector(".scroll-shell");
    el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
  }, fraction);
  await gp.waitForTimeout(900);
  return gp.evaluate(() => {
    const v = document.querySelector("video");
    return { t: +v.currentTime.toFixed(2), dur: +v.duration.toFixed(2) };
  });
};

for (const f of [0.25, 0.5, 0.75]) {
  const { t, dur } = await readAt(f);
  step(`scroll ${f * 100}% → video.currentTime ${t}s / ${dur}s`);
}
await gp.screenshot({ path: "shot-mid.png" });

await readAt(1);
await gp.waitForTimeout(1600);
const cardText = await gp.locator("section:has-text('Wedding Invitation')").last().innerText();
step("arrived at card. contains venue: " + cardText.includes("Lalitha Mahal") +
     " | date: " + cardText.includes("March 8, 2027") +
     " | muhurtham: " + cardText.includes("Muhurtham: 10:15 AM"));
step("confetti canvas present: " + (await gp.locator("canvas").count() > 0));
await gp.screenshot({ path: "shot-card.png" });

/* ---- ownership isolation ---- */
const inviteId = page.url().split("/dashboard/")[1];
const other = await browser.newContext();
const op = await other.newPage();
await op.goto(BASE + "/signup");
await op.fill('input[name="email"]', `intruder-${Date.now()}@example.com`);
await op.fill('input[name="password"]', "supersecret1");
await op.click('button[type="submit"]');
await op.waitForURL("**/dashboard");
const res = await op.goto(BASE + "/dashboard/" + inviteId);
step("other account opening someone else's invite → HTTP " + res.status());

console.log(errors.length ? "\nJS ERRORS:\n" + errors.join("\n") : "\nNo JS errors.");
await browser.close();
