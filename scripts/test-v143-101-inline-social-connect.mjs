import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const automation = read("app/automation/page.jsx");
const modal = read("components/InlineSocialConnectModal.jsx");
const css = read("app/styles/54-v143-101-inline-social-connect.css");
const globals = read("app/globals.css");
const labels = read("lib/i18n/defaultLabels.js");
const swedish = read("lib/i18n/builtInLocaleLabels.js");

const checks = [
  [!automation.includes('href="/social-channels"'), "automation no longer navigates away to /social-channels"],
  [automation.includes("<InlineSocialConnectModal"), "automation renders shared inline social connection modal"],
  [automation.includes("handleInlineSocialChannelConnected"), "successful OAuth refreshes connected channels in-place"],
  [automation.includes("setPlatform(formatPlatformSelectionFromKeys([normalizedPlatformKey], refreshedOptions))"), "newly connected channel is selected automatically"],
  [modal.includes('window.open('), "OAuth opens in a popup"],
  [modal.includes('event.data?.type !== SOCIAL_OAUTH_MESSAGE_TYPE'), "OAuth popup result is received through same-origin postMessage"],
  [modal.includes('/api/auth/youtube/start') && modal.includes('/api/auth/instagram/start') && modal.includes('/api/meta/connect'), "inline modal supports current connected platforms"],
  [modal.includes("popupBlocked") && !modal.includes("window.location.href = payload.url"), "popup-block fallback preserves the current planner instead of navigating away"],
  [globals.includes('54-v143-101-inline-social-connect.css'), "new modal styles are loaded"],
  [css.includes("inline-social-connect-grid") && css.includes("inline-connect-channel-trigger"), "modal and planner trigger styles exist"],
  [labels.includes('automation.inlineChannel.title') && swedish.includes('automation.inlineChannel.title'), "English and Swedish UI labels are present"],
];

let failed = 0;
for (const [ok, label] of checks) {
  if (ok) console.log(`PASS: ${label}`);
  else {
    failed += 1;
    console.error(`FAIL: ${label}`);
  }
}

if (failed) process.exit(1);
console.log("v143.101 inline social connect regression checks passed.");
