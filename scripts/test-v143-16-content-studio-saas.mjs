import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const automationPage = read("app/automation/page.jsx");
const globals = read("app/globals.css");
const theme = read("app/styles/40-v143-16-content-studio-saas.css");

assert.match(globals, /40-v143-16-content-studio-saas\.css/u);
assert.match(automationPage, /className="plan-v14316-command-center"/u);
assert.match(automationPage, /className="plan-v14316-summary-grid"/u);
assert.match(automationPage, /className="plan-v14316-steps"/u);
assert.match(automationPage, /studioReadinessPercent/u);
assert.match(automationPage, /role="progressbar"/u);
assert.match(automationPage, /aria-valuenow=\{studioReadinessPercent\}/u);
assert.match(automationPage, /id="plan-v14316-setup"/u);
assert.match(automationPage, /id="plan-v14316-formats"/u);
assert.match(automationPage, /id="plan-v14316-activate"/u);

assert.doesNotMatch(
  automationPage,
  /className="plan-v95-template-button"/u,
  "the unavailable template action should not remain in the primary workflow"
);
assert.doesNotMatch(
  automationPage,
  /\bBookmark\b/u,
  "the removed template action must not leave a stale icon import"
);

for (const selector of [
  ".plan-v70-header",
  ".plan-v14316-command-center",
  ".plan-v14316-steps",
  ".plan-v14316-summary-grid",
  ".plan-v90-settings-grid",
  ".plan-v72-format-library.grid",
  ".plan-v70-planned-row",
  ".plan-v107-bottom-grid",
  ".plan-v70-activate-card",
]) {
  assert.ok(theme.includes(selector), `missing v143.16 styling for ${selector}`);
}

assert.match(theme, /@media \(max-width: 1180px\)/u);
assert.match(theme, /@media \(max-width: 940px\)/u);
assert.match(theme, /@media \(max-width: 760px\)/u);
assert.match(theme, /@media \(max-width: 520px\)/u);
assert.match(theme, /@media \(prefers-reduced-motion: reduce\)/u);
assert.doesNotMatch(
  theme,
  /\.campaign-planner-clean/u,
  "the ordinary-plan makeover must not alter calendar campaign mode"
);

console.log("v143.16 AI Content Studio SaaS makeover checks passed.");
