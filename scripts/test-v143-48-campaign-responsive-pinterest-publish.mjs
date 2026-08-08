import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const page = read("app/automation/page.jsx");
const css = read("app/styles/38-current-experience-v143.css");
const labels = read("lib/i18n/defaultLabels.js");
const builtIn = read("lib/i18n/builtInLocaleLabels.js");
const worker = read("app/api/cron/run-automations/route.js");

check("Campaign hero uses new desktop image", css.includes("spreelo-campaign-plan-hero-desktop-v143-48.png"));
check("Campaign hero has tablet image", css.includes("spreelo-campaign-plan-hero-tablet-v143-48.png"));
check("Campaign hero has mobile image", css.includes("spreelo-campaign-plan-hero-mobile-v143-48.png"));
check("AI Content Studio uses new wide hero", css.includes("spreelo-ai-content-studio-hero-wide-v143-48.png"));
check("Campaign page widens beyond legacy narrow canvas", css.includes("max-width: 1720px !important"));
check("Campaign date picker can escape its cards", css.includes("The plan needs to allow date/time popovers to escape the card") && css.includes("z-index: 260 !important"));
check("Misleading whole-plan button is removed", !page.includes("campaign-v14335-show-plan"));
check("Plan help moved beside content types", page.includes("campaign-v14348-plan-help") && page.includes("setShowLearnMoreModal(true)"));
check("Three-dot menu contains post details and delete", page.includes("campaign-v14348-row-menu") && page.includes("automation.campaignExperience.deletePost") && page.includes("Trash2"));
check("Campaign delete asks for confirmation", page.includes("removeCampaignSlot") && page.includes("automation.campaignExperience.deletePostConfirm"));
check("Activation success modal exists", page.includes("campaign-v14348-activated-modal") && page.includes("automation.campaignActivated.title"));
check("Activation modal routes to Home", page.includes('window.location.href = "/"'));
check("Activation modal routes to campaign calendar", page.includes('window.location.href = "/calendar"'));
check("Activation modal can start ongoing planner", page.includes("startAnotherPlan()"));
check("Help copy explains approval before publishing", labels.includes("each post is sent for review and must be approved") && builtIn.includes("måste godkännas innan Spreelo publicerar"));

check("Pinterest is a publishing target", worker.includes('normalized.includes("pinterest")') && worker.includes('targets.push("pinterest")'));
check("Pinterest publisher uses Create Pin endpoint", worker.includes('getPinterestApiBaseUrl') && worker.includes('fetch(`${getPinterestApiBaseUrl()}/pins`'));
check("Pinterest carousel uses multi-image URL media source", worker.includes('source_type: "multiple_image_urls"'));
check("Pinterest carousel is capped at five images", worker.includes(".slice(0, 5)"));
check("Pinterest uses selected board connection", worker.includes('platform", "pinterest"') && worker.includes("boardId: pinterestConnectionForPost.page_id"));
check("Pinterest access token is kept healthy automatically", worker.includes("getHealthyPinterestAccessToken") && worker.includes("forceRefresh: true"));
check("Pinterest auth failures can mark connection unhealthy", worker.includes('platform: "pinterest"') && worker.includes("isPinterestAuthError(error)"));
check("Pinterest publish counters are in summary", worker.includes("pinterest_publish_checked: 0") && worker.includes("pinterest_published: 0") && worker.includes("pinterest_publish_failed: 0"));

for (const image of [
  "public/backgrounds/spreelo-campaign-plan-hero-desktop-v143-48.png",
  "public/backgrounds/spreelo-campaign-plan-hero-tablet-v143-48.png",
  "public/backgrounds/spreelo-campaign-plan-hero-mobile-v143-48.png",
  "public/backgrounds/spreelo-ai-content-studio-hero-wide-v143-48.png",
]) {
  check(`Hero asset exists: ${path.basename(image)}`, fs.existsSync(path.join(root, image)));
}

for (const key of [
  "automation.campaignExperience.help",
  "automation.campaignExperience.deletePost",
  "automation.campaignExperience.deletePostConfirm",
  "automation.campaignActivated.title",
  "automation.campaignActivated.home",
  "automation.campaignActivated.nextCampaign",
  "automation.campaignActivated.ongoing",
  "automation.postActions",
]) {
  check(`Default translation exists: ${key}`, labels.includes(`"${key}"`));
  check(`Swedish translation exists: ${key}`, builtIn.includes(`"${key}"`));
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "✓" : "✗"} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} v143.48 checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.48 campaign + Pinterest publishing checks passed.`);
