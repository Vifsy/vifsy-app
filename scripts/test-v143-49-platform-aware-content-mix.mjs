import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const compatibilitySource = read("lib/platformContentCompatibility.js");
const compatibility = await import(
  `data:text/javascript;base64,${Buffer.from(compatibilitySource).toString("base64")}`
);

const {
  SPREELO_PLATFORM_ORDER,
  SPREELO_PLATFORM_PROFILES,
  getContentTypeDestinationPlatforms,
  getContentTypePlatformAdaptations,
  normalizeSpreeloPlatformList,
} = compatibility;

const allPlatforms = [
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "pinterest",
  "youtube",
  "threads",
  "snapchat",
  "weibo",
];

assert.deepEqual(SPREELO_PLATFORM_ORDER, allPlatforms, "All nine planned channels must be centralized in deterministic order");
assert.deepEqual(Object.keys(SPREELO_PLATFORM_PROFILES), allPlatforms, "Each planned channel needs one compatibility profile");
assert.deepEqual(
  normalizeSpreeloPlatformList("Instagram + YouTube + Pinterest"),
  ["instagram", "pinterest", "youtube"],
  "Platform strings must normalize consistently"
);

const allImageDestinations = getContentTypeDestinationPlatforms({
  contentTypeId: "website_item",
  contentFormat: "single_image",
  selectedPlatforms: allPlatforms,
});
assert(!allImageDestinations.includes("youtube"), "Static product images should skip YouTube in a broad multi-channel plan");
assert(allImageDestinations.includes("pinterest"), "Static product images should still include Pinterest");

const allCarouselDestinations = getContentTypeDestinationPlatforms({
  contentTypeId: "carousel_website_item",
  contentFormat: "carousel",
  selectedPlatforms: allPlatforms,
});
assert(!allCarouselDestinations.includes("youtube"), "Product carousels should skip YouTube in a broad multi-channel plan");
assert(allCarouselDestinations.includes("pinterest"), "Product carousels should keep Pinterest with an adapter");

const allAnimatedDestinations = getContentTypeDestinationPlatforms({
  contentTypeId: "animated_website_item",
  contentFormat: "animated_video",
  selectedPlatforms: allPlatforms,
});
assert(allAnimatedDestinations.includes("youtube"), "Animated product video should include YouTube");
assert(!allAnimatedDestinations.includes("pinterest"), "Animated product video must not promise Pinterest until Spreelo's Pinterest video publisher exists");

const allTipsDestinations = getContentTypeDestinationPlatforms({
  contentTypeId: "tips",
  selectedPlatforms: allPlatforms,
});
assert.deepEqual(allTipsDestinations, allPlatforms, "Editorial formats with a YouTube adapter can cover all nine selected channels");

assert.deepEqual(
  getContentTypeDestinationPlatforms({
    contentTypeId: "website_item",
    selectedPlatforms: ["youtube"],
  }),
  ["youtube"],
  "YouTube-only plans should adapt a static master instead of rejecting the post"
);
assert.deepEqual(
  getContentTypeDestinationPlatforms({
    contentTypeId: "carousel_website_item",
    contentFormat: "carousel",
    selectedPlatforms: ["youtube"],
  }),
  ["youtube"],
  "YouTube-only plans should adapt a carousel master into a slideshow/Short"
);
assert.deepEqual(
  getContentTypeDestinationPlatforms({
    contentTypeId: "animated_website_item",
    contentFormat: "animated_video",
    selectedPlatforms: ["pinterest"],
  }),
  [],
  "Pinterest-only animated video should be replaced while the live publisher lacks video support"
);

const tipsAdaptations = getContentTypePlatformAdaptations({
  contentTypeId: "tips",
  selectedPlatforms: allPlatforms,
});
assert.equal(tipsAdaptations.youtube?.adapter, "short_video_from_master", "YouTube editorial content should use a master-to-Short adapter");

const carouselAdaptations = getContentTypePlatformAdaptations({
  contentTypeId: "carousel_website_item",
  contentFormat: "carousel",
  selectedPlatforms: ["facebook", "pinterest"],
});
assert.equal(carouselAdaptations.pinterest?.adapter, "multi_image_pin_max_5", "Pinterest carousel adapter should be explicit and centralized");

const page = read("app/automation/page.jsx");
assert(page.includes('from "../../lib/platformContentCompatibility"'), "AI Content Studio must use the central compatibility engine");
assert(page.includes("function applyPlatformSelection(nextPlatformKeys)"), "Channel toggles need one centralized selection handler");
assert(page.includes('ensureChannelCoverage: planCreationMode === "auto" || planCreationMode === "campaign"'), "Generated plans and campaigns must rebalance channel coverage before activation");
assert(page.includes("minimumCoveragePerChannel"), "Rebalancing must ensure selected channels are actually represented");
assert(page.includes('slot?.contentTypeId !== "manual_prompt"'), "Coverage rebalancing must not rewrite the customer’s custom post");
assert(page.includes("getSlotPlatformOptions(slot)"), "Each post needs its own actual destination list");
assert(page.includes("campaign-v14349-slot-channels"), "Campaign preview must display per-post destination channels");
assert(page.includes("plan-v74-channel-stack"), "AI Content Studio rows must display per-post destination channels");
assert(page.includes("plan-v14349-platform-adapter-note"), "UI should explain that Spreelo adapts each post to matching channels");
assert(page.includes("const slotDestinationKeys = getSlotDestinationPlatformKeys("), "Save flow must calculate per-post destinations");
assert(page.includes("platform: slotPlatform || platform"), "Each automation rule must persist its own channel subset");
assert(page.includes("actualPlanPlatformKeys"), "Activation summary must report actual destinations rather than every selected channel blindly");
assert(page.includes("actualPlanChannelsLabel"), "Activation email must use actual channel coverage");
assert(page.includes("fitsTargetPlatforms"), "Recurring adaptive weekly variants must remain compatible with the rule's channel subset");
assert(page.includes("selectedPlatforms: slotDestinationKeys"), "Saved recurring variants must be filtered against the post's actual destinations");

const planRoute = read("app/api/plan-content/route.js");
assert(planRoute.includes("platforms = []"), "Plan API must accept the selected channel list");
assert(planRoute.includes("selectedPlatforms"), "Plan API must normalize selected channels");
assert(planRoute.includes("destination_platforms"), "Plan API must return deterministic destinations for each proposed post");
assert(planRoute.includes("Channel choice affects the format mix before generation"), "Planning prompt must make channels influence the content-type mix");
assert(planRoute.includes("do not force every post onto every channel"), "Planning prompt must permit intentional per-post channel subsets");
assert(planRoute.includes("one master content idea and uses platform adapters"), "Planning prompt must prevent separate creative generation per channel");
assert.equal(
  (planRoute.match(/openai\.responses\.create\(/g) || []).length,
  1,
  "Platform-aware planning must remain one OpenAI planning request, not one request per channel"
);

const worker = read("app/api/cron/run-automations/route.js");
for (const channel of ["LinkedIn", "Pinterest", "Threads", "Snapchat", "Weibo"]) {
  assert(worker.includes(channel), `Approval email channel labels must recognize ${channel}`);
}

const labels = read("lib/i18n/defaultLabels.js");
const svLabels = read("lib/i18n/builtInLocaleLabels.js");
assert(labels.includes('"automation.platformCompatibility.adaptsAutomatically"'), "English source label for platform adaptation must exist");
assert(svLabels.includes('"automation.platformCompatibility.adaptsAutomatically"'), "Swedish platform adaptation fallback must exist");

const css = read("app/styles/38-current-experience-v143.css");
assert(css.includes("campaign-v14349-slot-channels"), "Campaign channel chips need desktop styling");
assert(css.includes('\"art copy date menu\"') && css.includes('\"art channels\"'), "Campaign layout needs responsive tablet/mobile grid rules");
assert(css.includes("plan-v14349-platform-adapter-note"), "Platform adapter explanation needs compact styling");

console.log("v143.49 platform-aware content mix: all checks passed");
