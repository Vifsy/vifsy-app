import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const [home, automation, css, labels, globals] = await Promise.all([
  readFile(new URL("../app/page.jsx", import.meta.url), "utf8"),
  readFile(new URL("../app/automation/page.jsx", import.meta.url), "utf8"),
  readFile(new URL("../app/styles/48-v143-35-home-campaign-reference.css", import.meta.url), "utf8"),
  readFile(new URL("../lib/i18n/defaultLabels.js", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);

assert.match(home, /home-v14335-hero/);
assert.match(home, /home-v14335-coach/);
assert.match(home, /home-v14335-activity/);
assert.match(automation, /campaign-v14335-hero/);
assert.match(automation, /campaign-v14335-benefits/);
assert.match(automation, /campaign-v14335-slot-list/);
assert.match(automation, /campaign-v14335-rationale/);
assert.match(automation, /campaign-v14335-activate/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /spreelo-ai-coach-v143-35\.png/);
assert.match(css, /spreelo-campaign-shopping-v143-35\.png/);
assert.match(labels, /dashboard\.aiCoach/);
assert.match(labels, /automation\.campaignExperience\.activateNow/);
assert.match(globals, /48-v143-35-home-campaign-reference\.css/);

await access(new URL("../public/backgrounds/spreelo-ai-coach-v143-35.png", import.meta.url));
await access(new URL("../public/backgrounds/spreelo-campaign-shopping-v143-35.png", import.meta.url));

console.log("v143.35 Home and calendar campaign reference checks passed.");
