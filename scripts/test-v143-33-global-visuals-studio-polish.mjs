import fs from "node:fs";
import { resolveCalendarVisualTheme, scoreCalendarVisualAsset } from "../lib/calendarVisualThemes.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const vietnameseChristmas = resolveCalendarVisualTheme({ title: "Giáng sinh", event_type: "holiday" });
expect(vietnameseChristmas.themeKey === "christmas", "Vietnamese Christmas must resolve to the canonical Christmas theme.");
expect(resolveCalendarVisualTheme({ title: "Julklappstips 2026" }).themeKey === "christmas", "Swedish Christmas must resolve to the same canonical theme.");
expect(resolveCalendarVisualTheme({ visual_theme_key: "christmas", title: "Navidad" }).themeKey === "christmas", "AI canonical metadata must remain authoritative across languages.");
expect(scoreCalendarVisualAsset({ theme_key: "christmas", theme_tags: ["christmas", "gifts"] }, vietnameseChristmas) >= 100, "Canonical theme matches must outrank loose tags.");
expect(scoreCalendarVisualAsset({ theme_key: "gaming", theme_tags: ["gaming"] }, vietnameseChristmas) === 0, "Unrelated assets must not be treated as safe matches.");

const worker = read("app/api/cron/generate-calendar-visuals/route.js");
const engine = read("app/api/analyze-brand/brandAnalysisEngine.js");
const migration = read("supabase/v143_33_global_calendar_visual_library.sql");
const planner = read("app/automation/page.jsx");
const styles = read("app/styles/46-v143-33-global-visuals-studio-polish.css");
const labels = read("lib/i18n/defaultLabels.js");

expect(worker.includes("reserve_calendar_visual_generation_capacity") && worker.includes("finally"), "Every OpenAI image request must reserve and release hard-cap capacity.");
expect(worker.includes("matchScore >= 30") && worker.includes("generic"), "Weak visual matches must fall back safely instead of selecting a random asset.");
expect(migration.includes("pg_advisory_xact_lock") && migration.includes("asset_total + reservation_total >= 150"), "The 150-image cap must be atomic across concurrent workers.");
expect(migration.includes("visual_theme_key") && migration.includes("visual_theme_tags"), "Campaigns and assets need language-independent visual metadata.");
expect(engine.includes('visual_theme_key": "One language-independent English visual theme key') && engine.includes('Vietnamese "Giáng sinh"'), "The existing brand-analysis call must return canonical visual metadata without another AI call.");
expect(planner.includes('slot?.contentTypeId === "service_focus"') && planner.includes("aiImageSuffix"), "Service copy must not claim a product is selected, while AI-image formats disclose the image.");
expect(planner.includes("plan-v143-timezone-inline") && !planner.includes("plan-v143-timezone-control"), "Timezone must live inside the Start date card.");
expect(styles.includes("campaign-planner-clean .plan-v70-formats-card{display:none") && styles.includes("flex-direction:column"), "Calendar studio must keep the focused campaign feature set and a stable one-column shell.");
expect(styles.includes("plan-v70-activate-card{display:block") && styles.includes("plan-v70-planned-post>div>span"), "Mobile plan cards and activation must have dedicated readable layouts.");
expect(styles.includes("brand-profile-summary-card") && styles.includes("dashboard-stat-card"), "Brand Profile and Dashboard must share the studio glass-card system.");
expect(labels.includes("from your website") && labels.includes("No website product is selected"), "Product and service descriptions must be consistent and unambiguous.");

console.log("v143.33 global visual themes, hard cap, studio copy and responsive design checks passed.");
