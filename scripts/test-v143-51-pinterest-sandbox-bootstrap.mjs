import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pinterest = read("lib/pinterestOAuth.js");
const boardsRoute = read("app/api/pinterest/boards/route.js");
const picker = read("app/social-channels/pinterest/select/page.jsx");
const social = read("app/social-channels/page.jsx");
const labels = read("lib/i18n/defaultLabels.js");
const builtIn = read("lib/i18n/builtInLocaleLabels.js");
const css = read("app/styles/39-social-channels-v143-42.css");

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check("Pinterest Sandbox environment remains explicit", pinterest.includes("PINTEREST_API_ENV") && pinterest.includes("api-sandbox.pinterest.com/v5"));
check("Board create helper uses environment-aware /boards", pinterest.includes("export async function createPinterestBoard") && pinterest.includes("`${getPinterestApiBaseUrl()}/boards`"));
check("Pin create helper uses environment-aware /pins", pinterest.includes("export async function createPinterestPin") && pinterest.includes("`${getPinterestApiBaseUrl()}/pins`"));
check("Invalid authorization grant is recognized as an auth error", pinterest.includes("authorization grant is invalid"));
check("Board API reports current Pinterest environment", boardsRoute.includes("api_environment: getPinterestApiEnvironment()"));
check("Sandbox board action is production-guarded", boardsRoute.includes('action === "create_sandbox_board"') && boardsRoute.includes('getPinterestApiEnvironment() !== "sandbox"'));
check("Sandbox setup creates an owned Spreelo Test board", boardsRoute.includes('preferredName = "Spreelo Test"') && boardsRoute.includes("createPinterestBoard"));
check("Sandbox setup creates a real test Pin", boardsRoute.includes("createPinterestPin") && boardsRoute.includes('title: "Spreelo Sandbox-test"'));
check("Sandbox test Pin uses public Spreelo image", boardsRoute.includes("spreelo-social-hero-desktop-v143-42.png"));
check("Sandbox board is activated only after write test", boardsRoute.indexOf("createPinterestPin") < boardsRoute.indexOf("activatePinterestBoard"));
check("Picker exposes sandbox bootstrap only in sandbox", picker.includes('apiEnvironment === "sandbox"') && picker.includes("createSandboxBoard"));
check("Picker no longer sends sandbox users to normal Pinterest to create a board", picker.includes('apiEnvironment === "sandbox" ? (') && picker.includes("pinterestCreateSandboxBoard"));
check("Sandbox success redirects with verification flag", picker.includes("pinterest_test_pin=1"));
check("Social channels shows explicit verified message", social.includes("pinterestSandboxVerifiedMessage"));
check("Sandbox bootstrap has English labels", labels.includes('"social.pinterestSandboxBoardTitle"') && labels.includes('"social.pinterestSandboxVerifiedMessage"'));
check("Sandbox bootstrap has Swedish labels", builtIn.includes('"social.pinterestSandboxBoardTitle"') && builtIn.includes('"social.pinterestSandboxVerifiedMessage"'));
check("Sandbox action has dedicated Spreelo styling", css.includes("pinterest-sandbox-create-button"));

console.log(`v143.51 checks passed: ${checks.length}/${checks.length}`);
