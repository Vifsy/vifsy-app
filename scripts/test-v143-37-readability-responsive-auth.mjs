import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const globals = read("app/globals.css");
const home = read("app/page.jsx");
const login = read("app/login/page.jsx");
const authRoute = read("app/api/auth/send-code/route.js");
const automation = read("app/automation/page.jsx");
const css = read("app/styles/49-v143-37-readability-responsive-auth.css");

assert.match(globals, /49-v143-37-readability-responsive-auth\.css/);
assert.doesNotMatch(home, /className="home-v14335-side-card home-v14335-quality"/);
assert.match(login, /fetch\("\/api\/auth\/send-code"/);
assert.match(login, /is-code-illustration/);
assert.match(authRoute, /auth\.admin\.generateLink/);
assert.match(authRoute, /email_otp/);
assert.match(authRoute, /getServerTranslations/);
assert.match(authRoute, /resend\.com\/emails/);
assert.match(automation, /is-shopping-visual/);
assert.match(automation, /is-calendar-visual/);
assert.match(css, /spreelo-login-ai-assistant-v143-37\.png/);
assert.match(css, /spreelo-campaign-shopping-v143-37\.png/);
assert.match(css, /spreelo-campaign-calendar-v143-37\.png/);
assert.match(css, /home-v14335-coach-actions/);
assert.match(css, /plan-v143-date-time-row/);
assert.match(css, /@media \(max-width: 1024px\)/);
assert.match(css, /@media \(max-width: 760px\)/);

console.log("v143.37 readability, responsive campaign studio, and localized auth checks passed");
