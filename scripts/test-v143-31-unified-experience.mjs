import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const planner = read("app/automation/page.jsx");
const brand = read("app/brand/page.jsx");
const social = read("app/social-channels/page.jsx");
const calendar = read("app/calendar/page.jsx");
const calendarWorker = read("app/api/cron/generate-calendar-visuals/route.js");
const adminPage = read("app/admin/post-approvals/page.jsx");
const adminApi = read("app/api/admin/post-approvals/route.js");
const regenerate = read("app/api/admin/post-approvals/regenerate/route.js");
const automationWorker = read("app/api/cron/run-automations/route.js");
const styles = read("app/styles/44-v143-31-unified-experience.css");
const i18n = read("lib/i18n/useUiText.js");

expect(planner.includes("spreelo_plan_recommendation_") && planner.includes("setSlots(instantSlots)"), "Goal-specific rows must appear immediately from cache or deterministic recommendations.");
expect(!planner.includes("plan-v95-template-button"), "Save as template must be removed.");
expect(planner.includes("plan-v143-timezone-inline") && planner.includes("getBrowserTimeZone()"), "The regular studio needs a compact, automatic timezone control.");
expect(brand.includes('setAnalysisResultStep("analyzing")') && brand.includes("brand-result-analysis-progress"), "Brand analysis must use the modal from the beginning.");
expect(!brand.includes('window.open("/social-channels"'), "Social channels must open in the same tab.");
expect(social.includes("social-success-modal") && social.includes('window.location.href = "/automation"'), "A successful social connection needs the two-step next-action modal.");
expect(calendar.includes("campaign-calendar-v143-summary") && !calendar.includes("campaign-calendar-v133-detail-section ideas"), "Expanded campaigns must use one focused summary block.");
expect(calendar.includes('!campaign.visual_image_url.endsWith("/calendar-generic.svg")'), "Generic calendar placeholders must use meaningful campaign glyphs while AI art is queued.");
expect(calendarWorker.includes("Recovered after an interrupted generation") && !calendarWorker.includes('.is("visual_asset_id", null)'), "Calendar image jobs must recover and replace temporary generic assets.");
expect(adminPage.includes("CAROUSEL_PRODUCT_COUNT = 5") && adminPage.includes("Exactly five products"), "Admin carousel editing must always expose five product slots.");
expect(!adminPage.includes("Save repair materials") && adminPage.includes("preserve_outro"), "The repair-materials save step must be removed and the AI outro must be preserved explicitly.");
expect(regenerate.includes("products.length !== 5") && regenerate.includes("generateCarouselOutroSlideImage"), "Carousel regeneration must enforce five products and conditionally generate the outro.");
expect(adminApi.includes("slideProducts.length > storedProducts.length"), "Older carousels must show all slide-derived products rather than a shorter stale material array.");
expect(automationWorker.includes("font-weight=\"820\"") && automationWorker.includes("slice(0, 4).join"), "Image overlays need heavier multilingual titles and short, untruncated kickers.");
expect(styles.includes("social-success-backdrop") && styles.includes("admin-carousel-product-grid") && styles.includes("campaign-calendar-v143-summary"), "The unified responsive design layer must cover all new flows.");
expect(i18n.includes('TRANSLATION_CACHE_VERSION = "v12"'), "The UI translation cache must refresh for the new complete label set.");

console.log("v143.31 unified experience, instant planning, calendar and five-product carousel checks passed.");
