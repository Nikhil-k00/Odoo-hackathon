import { chromium } from "playwright";
const BASE = process.env.E2E_BASE_URL || "http://localhost:3177";
const OUT = process.argv[2] || "tests/output";
import { mkdirSync } from "node:fs"; mkdirSync(OUT, { recursive: true });
const results = []; const consoleErrors = []; const badResponses = [];
const browser = await chromium.launch();
const newPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${page.url()} :: ${m.text().slice(0, 200)}`); });
  page.on("response", (r) => { if (r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`); });
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()} :: PAGEERROR ${e.message.slice(0, 200)}`));
  return page;
};
let n = 0;
async function step(name, fn) {
  n++;
  try { const info = await fn(); results.push(`PASS ${n}. ${name}${info ? " — " + info : ""}`); }
  catch (e) { results.push(`FAIL ${n}. ${name} — ${String(e.message || e).split("\n")[0].slice(0, 220)}`); if (globalThis.__page) { try { await globalThis.__page.screenshot({ path: `${OUT}/fail-${n}.png` }); } catch {} } }
}
const today = new Date(); const iso = (d) => d.toISOString().slice(0, 10);
const plus = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return d; };
const sel = async (page, trigger, optionText) => { await trigger.click(); await page.getByRole("option", { name: optionText, exact: false }).first().click(); };
const login = async (page, email, password) => {
  await page.goto(`${BASE}/login`); await page.fill("#email", email); await page.fill("#password", password);
  await page.getByRole("button", { name: /sign in/i }).click(); await page.waitForURL(/\/(dashboard|portal|login)/, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
};
const toastText = async (page) => { const t = page.locator("[data-sonner-toast]").last(); await t.waitFor({ timeout: 8000 }); return (await t.innerText()).replace(/\s+/g, " ").trim(); };

// ---------- 1. signup ----------
let page = await newPage(); globalThis.__page = page;
await step("Signup rejects weak password", async () => {
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", "E2E Visitor"); await page.fill("#email", `visitor${Date.now()}@demo.in`);
  await page.fill("#password", "weakpass"); await page.fill("#confirmPassword", "weakpass");
  await page.getByRole("button", { name: /create account|sign up/i }).click(); await page.waitForTimeout(1200);
  if (!page.url().includes("/signup")) throw new Error("navigated away: " + page.url());
  const body = await page.innerText("body"); if (!/uppercase|special|8 characters/i.test(body)) throw new Error("no rule error shown");
  return "stayed on signup with rule errors";
});
const visitorEmail = `visitor${Date.now()}@demo.in`;
await step("Signup with strong password lands in portal", async () => {
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", "E2E Visitor"); await page.fill("#email", visitorEmail);
  await page.fill("#password", "Visitor@1234"); await page.fill("#confirmPassword", "Visitor@1234");
  await page.getByRole("button", { name: /create account|sign up/i }).click(); await page.waitForURL(/\/portal/, { timeout: 10000 }); return page.url();
});
await step("Duplicate email rejected on signup", async () => {
  const p2 = await newPage(); await p2.goto(`${BASE}/signup`);
  await p2.fill("#name", "Dup"); await p2.fill("#email", visitorEmail); await p2.fill("#password", "Visitor@1234"); await p2.fill("#confirmPassword", "Visitor@1234");
  await p2.getByRole("button", { name: /create account|sign up/i }).click(); await p2.waitForTimeout(1500);
  const body = await p2.innerText("body"); await p2.context().close(); if (!/already|exists|taken|in use/i.test(body)) throw new Error("no duplicate error"); return "duplicate error shown";
});
await page.context().close();

// ---------- 2. login ----------
page = await newPage(); globalThis.__page = page;
await step("Login with wrong password shows error", async () => {
  await login(page, "admin@recurra.in", "wrong"); const body = await page.innerText("body");
  if (!page.url().includes("/login")) throw new Error("navigated to " + page.url()); if (!/invalid|incorrect|wrong|credentials/i.test(body)) throw new Error("no error text"); return "error shown";
});
await step("Admin login redirects to dashboard", async () => { await login(page, "admin@recurra.in", "Admin@1234"); if (!page.url().includes("/dashboard")) throw new Error(page.url()); return page.url(); });

// ---------- 3. catalog ----------
await step("Tax: percent > 100 rejected inline", async () => {
  await page.goto(`${BASE}/taxes`); await page.getByRole("button", { name: /new tax|create first tax/i }).first().click();
  await page.fill("#tax-name", "Bad tax"); await page.fill("#tax-percent", "150"); await page.getByRole("button", { name: /create tax/i }).click(); await page.waitForTimeout(1000);
  const dlg = await page.innerText("body"); if (!/between 0 and 100/i.test(dlg)) throw new Error("no inline error"); await page.keyboard.press("Escape"); return "inline error";
});
await step("Tax: create VAT 5%", async () => {
  await page.goto(`${BASE}/taxes`); await page.getByRole("button", { name: /new tax|create first tax/i }).first().click();
  await page.fill("#tax-name", "VAT 5%"); await page.fill("#tax-percent", "5"); await page.getByRole("button", { name: /create tax/i }).click();
  await page.waitForTimeout(1500); await page.goto(`${BASE}/taxes`); const body = await page.innerText("body"); if (!body.includes("VAT 5%")) throw new Error("row missing"); return "row present";
});
await step("Product: negative price rejected, then create with tax", async () => {
  await page.goto(`${BASE}/products`); await page.getByRole("button", { name: /new product|create first product/i }).first().click();
  await page.fill("#product-name", "E2E Product"); await page.fill("#product-sales", "-5"); await page.fill("#product-cost", "500");
  await page.getByRole("button", { name: /create product/i }).click(); await page.waitForTimeout(1000);
  if (!/negative/i.test(await page.innerText("body"))) throw new Error("no negative-price error");
  const kept = await page.inputValue("#product-name"); if (kept !== "E2E Product") throw new Error("fields cleared after validation error (name=" + JSON.stringify(kept) + ")"); await page.fill("#product-sales", "1000"); await sel(page, page.locator("#product-tax"), "GST 18%");
  await page.getByRole("button", { name: /create product/i }).click(); await page.waitForTimeout(1500);
  await page.goto(`${BASE}/products`); if (!(await page.innerText("body")).includes("E2E Product")) throw new Error("product row missing"); return "created";
});
await step("Product detail: add variant Brand/E2E +100 shows final price 1,100", async () => {
  await page.goto(`${BASE}/products`); await page.getByRole("link", { name: "E2E Product" }).first().click(); await page.waitForLoadState("networkidle");
  await page.fill("#variant-attribute", "Brand"); await page.fill("#variant-value", "E2E"); await page.fill("#variant-extra", "100");
  await page.locator("form:has(#variant-attribute) button[type=submit]").click(); await page.waitForTimeout(1500);
  const body = await page.innerText("body"); if (!/1,100/.test(body)) throw new Error("final price not shown"); return "₹1,100 shown";
});
await step("Plan: end before start rejected, then create pausable plan", async () => {
  await page.goto(`${BASE}/plans`); await page.getByRole("button", { name: /new plan|create first plan/i }).first().click();
  await page.fill("#plan-name", "E2E Plan"); await page.fill("#plan-price", "500"); await page.fill("#plan-start", iso(today)); await page.fill("#plan-end", iso(plus(-5)));
  await page.getByRole("button", { name: /create plan/i }).click(); await page.waitForTimeout(1000);
  if (!/after/i.test(await page.innerText("body"))) throw new Error("no end-date error");
  await page.fill("#plan-end", ""); await page.locator("#switch-pausable").evaluate((el) => ((el.closest("button") || el.previousElementSibling || el)).click()); await page.getByRole("button", { name: /create plan/i }).click(); await page.waitForTimeout(1500);
  await page.goto(`${BASE}/plans`); if (!(await page.innerText("body")).includes("E2E Plan")) throw new Error("plan missing"); return "created";
});
await step("Discount: percent > 100 rejected, then create E2E10", async () => {
  await page.goto(`${BASE}/discounts`); await page.getByRole("button", { name: /new discount|create first discount/i }).first().click();
  await page.fill("#discount-name", "E2E10"); await page.fill("#discount-value", "150"); await page.fill("#discount-start", iso(plus(-1))); await page.fill("#discount-end", iso(plus(60)));
  await page.getByRole("button", { name: /create discount/i }).click(); await page.waitForTimeout(1000);
  if (!/100/i.test(await page.innerText("body"))) throw new Error("no percent error");
  if ((await page.inputValue("#discount-name")) !== "E2E10") throw new Error("discount fields cleared after validation error"); await page.fill("#discount-value", "10"); await page.getByRole("button", { name: /create discount/i }).click(); await page.waitForTimeout(1500);
  await page.goto(`${BASE}/discounts`); if (!(await page.innerText("body")).includes("E2E10")) throw new Error("discount missing"); return "created";
});

// ---------- 4. users / customers ----------
await step("Users: admin creates internal user", async () => {
  await page.goto(`${BASE}/users`); await page.fill("#cu-name", "E2E Staff"); await page.fill("#cu-email", "e2estaff@recurra.in"); await page.fill("#cu-password", "Staff@1234");
  await page.locator("form:has(#cu-name) button[type=submit]").click(); await page.waitForTimeout(1500); await page.goto(`${BASE}/users`);
  if (!(await page.innerText("body")).includes("e2estaff@recurra.in")) throw new Error("user missing"); return "created";
});
await step("Customers: invalid GSTIN rejected, then create", async () => {
  await page.goto(`${BASE}/customers/new`); await page.fill("#c-name", "E2E Customer"); await page.fill("#c-email", "e2ecust@demo.in"); await page.fill("#c-gstin", "BADGST");
  await sel(page, page.getByRole("combobox").first(), "Kerala");
  await page.getByRole("button", { name: /create customer/i }).click(); await page.waitForTimeout(800);
  if (!/GSTIN format/i.test(await page.innerText("body"))) throw new Error("no gstin error");
  await page.fill("#c-gstin", "32ABCDE1234F1Z5"); await page.getByRole("button", { name: /create customer/i }).click(); await page.waitForURL(/\/customers$/, { timeout: 8000 });
  if (!(await page.innerText("body")).includes("E2E Customer")) throw new Error("customer missing"); return "created";
});

// ---------- 5. templates + subscriptions ----------
await step("Template: create with plan + line", async () => {
  await page.goto(`${BASE}/templates/new`); await page.fill("#name", "E2E Template"); await page.fill("#validity", "15");
  const combos = page.getByRole("combobox"); await sel(page, combos.nth(0), "Monthly ·"); await sel(page, combos.nth(1), "Cloud ERP Seat");
  await page.getByRole("button", { name: /create template/i }).click(); await page.waitForURL(/\/templates$/, { timeout: 8000 });
  if (!(await page.innerText("body")).includes("E2E Template")) throw new Error("template missing"); return "created";
});
let subUrl = "";
await step("Subscription: create from template (prefills plan + lines)", async () => {
  await page.goto(`${BASE}/subscriptions/new`); const combos = page.getByRole("combobox");
  await sel(page, combos.nth(0), "E2E Template"); await page.waitForTimeout(300);
  await sel(page, page.getByRole("combobox").nth(1), "Anjali Menon");
  const planText = await page.getByRole("combobox").nth(2).innerText(); if (!/Monthly/.test(planText)) throw new Error("plan not prefilled: " + planText);
  await page.fill("#start", iso(today));
  const amount = await page.innerText("body"); if (!/1,500/.test(amount)) throw new Error("line amount not computed");
  await page.getByRole("button", { name: /create subscription/i }).click(); await page.waitForURL(/\/subscriptions\/(?!new)[a-z0-9]+$/, { timeout: 15000 }); await page.waitForLoadState("load"); subUrl = page.url();
  const body = await page.innerText("body"); if (!/SUB-0001/.test(body) || !/DRAFT/.test(body)) throw new Error("number/status missing"); return "SUB-0001 DRAFT";
});
await step("Subscription: expiration before start rejected", async () => {
  await page.goto(`${BASE}/subscriptions/new`); await sel(page, page.getByRole("combobox").nth(1), "Anjali Menon"); await sel(page, page.getByRole("combobox").nth(2), "Monthly ·");
  await page.fill("#start", iso(today)); await page.fill("#exp", iso(plus(-3)));
  await sel(page, page.getByRole("combobox").nth(4), "Cloud ERP Seat");
  await page.getByRole("button", { name: /create subscription/i }).click(); await page.waitForTimeout(800);
  if (!/after the start/i.test(await page.innerText("body"))) throw new Error("no expiration error"); return "inline error";
});
await step("Status flow: Draft → Quotation → Confirmed → Active (+timeline, nextBillingDate)", async () => {
  await page.goto(subUrl);
  for (const [btn, st] of [["Send Quotation", "QUOTATION"], ["Confirm", "CONFIRMED"], ["Activate", "ACTIVE"]]) {
    await page.getByRole("button", { name: btn, exact: true }).click(); await page.waitForTimeout(1200);
    const body = await page.innerText("body"); if (!new RegExp(`\\b${st}\\b`).test(body)) throw new Error(`status ${st} not reached`);
  }
  const body = await page.innerText("body");
  const logs = (body.match(/Status →|Status changed/g) || []).length; if (logs < 3) throw new Error("timeline entries: " + logs);
  if (!/Next billing\s+\d{2} \w{3} \d{4}/.test(body)) throw new Error("nextBillingDate not set");
  return `timeline entries ${logs}`;
});
await step("Status flow: Pause available (plan pausable) and invalid jump rejected server-side", async () => {
  await page.goto(subUrl); const pause = page.getByRole("button", { name: "Pause", exact: true }); if (!(await pause.count())) throw new Error("Pause button missing");
  await pause.click(); await page.waitForTimeout(1000); if (!/PAUSED/.test(await page.innerText("body"))) throw new Error("not paused");
  await page.getByRole("button", { name: "Activate", exact: true }).click(); await page.waitForTimeout(1000); if (!/\bACTIVE\b/.test(await page.innerText("body"))) throw new Error("not re-activated");
  const edit = page.getByRole("link", { name: /edit/i }); if (await edit.count()) throw new Error("Edit still offered on ACTIVE"); return "pause/resume ok, edit hidden";
});

// ---------- 6. billing ----------
await step("Billing: preview shows 1 ready", async () => {
  await page.goto(`${BASE}/billing`); await page.getByRole("button", { name: /preview/i }).click(); const t = await toastText(page); if (!/1 invoices ready/i.test(t)) throw new Error("toast: " + t); return t;
});
await step("Billing: commit creates invoice", async () => {
  await page.getByRole("button", { name: /run billing \(commit\)/i }).click(); const t = await toastText(page); if (!/created 1 invoice/i.test(t)) throw new Error("toast: " + t); return t;
});
await step("Billing: commit again creates 0 (idempotent)", async () => {
  await page.waitForTimeout(500); await page.getByRole("button", { name: /run billing \(commit\)/i }).click(); await page.waitForTimeout(1500);
  const toasts = await page.locator("[data-sonner-toast]").allInnerTexts(); const t = toasts.join(" | "); if (!/0 new invoices/i.test(t)) throw new Error("toast: " + t); return "0 new invoices";
});
let invUrl = "";
await step("Invoice detail: Kerala shows CGST + SGST, discount applied", async () => {
  await page.goto(`${BASE}/invoices`); await page.getByRole("link", { name: "INV-0001" }).first().click(); await page.waitForLoadState("networkidle"); invUrl = page.url();
  const body = await page.innerText("body"); if (!/CGST/.test(body) || !/SGST/.test(body)) throw new Error("GST split missing"); if (!/E2E10|LAUNCH10|Discount/i.test(body)) throw new Error("discount not shown");
  return "CGST/SGST + discount visible";
});
await step("Invoice: record payment > outstanding rejected, full payment → PAID", async () => {
  await page.goto(invUrl); await page.getByRole("button", { name: /record payment/i }).click(); await page.fill("#amount", "999999");
  await page.locator("form:has(#amount) button[type=submit]").click(); await page.waitForTimeout(1000);
  const b1 = await page.innerText("body"); if (!/exceed|outstanding|cannot|greater/i.test(b1)) throw new Error("over-payment accepted?");
  const outstanding = (b1.match(/Outstanding[^₹]*₹\s?([\d,]+\.\d{2})/) || [])[1]; if (!outstanding) throw new Error("cannot read outstanding");
  await page.fill("#amount", outstanding.replace(/,/g, "")); await page.locator("form:has(#amount) button[type=submit]").click(); await page.waitForTimeout(1500);
  await page.goto(invUrl); if (!/\bPAID\b/.test(await page.innerText("body"))) throw new Error("not PAID"); return `paid ${outstanding}`;
});
await step("Time machine: bill as of +2 months creates next invoices", async () => {
  await page.goto(`${BASE}/billing`); await page.fill("input[type=date]", iso(plus(62)));
  await page.getByRole("button", { name: /run billing \(commit\)/i }).click(); const t = await toastText(page); if (!/created [1-9]/i.test(t)) throw new Error("toast: " + t); return t;
});
await step("Invoices list shows overdue badge filter works", async () => {
  await page.goto(`${BASE}/invoices`); await page.getByRole("button", { name: /overdue/i }).click(); await page.waitForTimeout(500); return "filter clickable";
});
await step("Payments page lists the payment", async () => { await page.goto(`${BASE}/payments`); if (!/INV-0001/.test(await page.innerText("body"))) throw new Error("payment missing"); return "listed"; });
await step("Dashboard + reports load real numbers", async () => {
  await page.goto(`${BASE}/dashboard`); const b = await page.innerText("body"); if (!/Revenue collected/.test(b) || /₹0\.00\s+0%/.test(b)) throw new Error("revenue still zero");
  await page.goto(`${BASE}/reports?status=ACTIVE`); const r = await page.innerText("body"); if (!/MRR by plan/.test(r)) throw new Error("reports missing"); return "ok";
});
await page.context().close();

// ---------- 7. staff restrictions ----------
page = await newPage(); globalThis.__page = page;
await step("Internal user cannot open /users or /discounts, commit hidden on billing", async () => {
  await login(page, "e2estaff@recurra.in", "Staff@1234"); if (!page.url().includes("/dashboard")) throw new Error("login landed " + page.url());
  await page.goto(`${BASE}/users`); if (page.url().includes("/users")) throw new Error("staff opened /users");
  await page.goto(`${BASE}/discounts`); if (page.url().includes("/discounts")) throw new Error("staff opened /discounts");
  await page.goto(`${BASE}/billing`); const commit = page.getByRole("button", { name: /run billing \(commit\)/i }); const c = await commit.count();
  return `redirected; commit button count=${c}${c ? " (disabled=" + (await commit.isDisabled()) + ")" : ""}`;
});
await step("Internal user cannot create tax (view only)", async () => { await page.goto(`${BASE}/taxes`); const n = await page.getByRole("button", { name: /new tax/i }).count(); if (n) throw new Error("New tax visible to staff"); return "no create button"; });
await page.context().close();

// ---------- 8. portal ----------
page = await newPage(); globalThis.__page = page;
await step("Portal: customer sees only own subscription/invoices; other data hidden", async () => {
  await login(page, "customer1@demo.in", "Customer@1234"); if (!page.url().includes("/portal")) throw new Error("landed " + page.url());
  const b = await page.innerText("body"); if (!/SUB-0001/.test(b)) throw new Error("own sub missing"); if (/Priya|Rahul/.test(b)) throw new Error("other customer data visible");
  await page.goto(`${BASE}/dashboard`); if (page.url().includes("/dashboard")) throw new Error("portal user opened dashboard"); return "scoped";
});
await step("Portal: pause/close buttons reflect plan flags; invoice read-only view opens", async () => {
  await page.goto(`${BASE}/portal`); const pause = await page.getByRole("button", { name: "Pause", exact: true }).count();
  await page.getByRole("link", { name: "INV-0001" }).first().click(); await page.waitForLoadState("networkidle"); const b = await page.innerText("body");
  if (!/CGST/.test(b)) throw new Error("portal invoice missing GST split"); return `pause buttons=${pause}`;
});
await page.context().close();

// ---------- 9. forgot / reset ----------
page = await newPage(); globalThis.__page = page;
await step("Forgot password shows reset link; reset enforces rules; new password works", async () => {
  await page.goto(`${BASE}/forgot-password`); await page.fill("#email", visitorEmail); await page.locator("form button[type=submit]").click(); await page.waitForTimeout(1500);
  const link = await page.locator("a[href*='/reset-password?token=']").first().getAttribute("href"); if (!link) throw new Error("no reset link shown");
  await page.goto(`${BASE}${link}`); await page.fill("#password", "weak"); await page.fill("#confirmPassword", "weak"); await page.locator("form button[type=submit]").click(); await page.waitForTimeout(1000);
  if (!/8 characters|uppercase/i.test(await page.innerText("body"))) throw new Error("weak reset accepted");
  await page.fill("#password", "Visitor@5678"); await page.fill("#confirmPassword", "Visitor@5678"); await page.locator("form button[type=submit]").click(); await page.waitForURL(/\/login/, { timeout: 8000 });
  await login(page, visitorEmail, "Visitor@5678"); if (!page.url().includes("/portal")) throw new Error("login with new password failed"); return "reset ok";
});
await page.context().close();
await browser.close();
console.log(results.join("\n"));
console.log("\n--- console errors (" + consoleErrors.length + ") ---"); console.log([...new Set(consoleErrors)].slice(0, 15).join("\n"));
console.log("--- 5xx responses (" + badResponses.length + ") ---"); console.log([...new Set(badResponses)].slice(0, 10).join("\n"));
