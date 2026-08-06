import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const planner = read("app/automation/page.jsx");
const brand = read("app/brand/page.jsx");
const calendarWorker = read("app/api/cron/generate-calendar-visuals/route.js");
const analysisEngine = read("app/api/analyze-brand/brandAnalysisEngine.js");
const glyphs = read("components/SpreeloIcons.jsx");
const styles = read("app/styles/45-v143-32-experience-correction.css");
const labels = read("lib/i18n/defaultLabels.js");
const builtIn = read("lib/i18n/builtInLocaleLabels.js");
const i18n = read("lib/i18n/useUiText.js");
const migration = read("supabase/v143_32_calendar_visual_request_targets.sql");

expect(planner.includes("plan-v143-timezone-control") && !planner.includes("plan-v143-timezone-inline"), "Timezone must sit above the equal-height settings grid.");
expect(planner.includes('t("automation.redesign.purpose")') && planner.includes('t("automation.redesign.cost")'), "Plan rows must use purpose and cost instead of format and status.");
expect(!planner.includes('<span className="plan-v70-status-pill">'), "The redundant planned status must be removed from draft rows.");
expect(planner.includes("getCustomerSlotMarketingPurpose"), "Each planned post needs a customer-facing strategic purpose.");
expect(brand.includes("brand-profile-summary-grid") && brand.includes('brand-profile-form-card${isEditing ? " editing"'), "Brand Profile needs a compact read-only summary and a dedicated edit dialog.");
expect(brand.includes("brand.websiteChangeReanalysis") && brand.includes("shouldAnalyzeWebsite"), "Website changes must explicitly trigger reanalysis.");
expect(brand.includes("brand-analysis-mark") && brand.includes("brand-result-analysis-steps"), "Analysis needs the Spreelo progress experience.");
expect(styles.includes("campaign-planner-clean .plan-v70-shell{display:flex") && styles.includes("wizard-main>.planner-primary-builder"), "Campaign mode must show the real studio and hide the legacy builder.");
expect(styles.includes("background-color:#edfbf3") && styles.includes("plan-v70-activate-card"), "The activation area must visibly use the completion-green treatment.");
expect(calendarWorker.includes("JOBS_PER_RUN = 4") && calendarWorker.includes("Promise.all"), "Calendar image generation must process several missing themes per run.");
expect(calendarWorker.includes('eq("id", job.opportunity_id)') && analysisEngine.includes("opportunity_id"), "Calendar visuals must target the exact campaign opportunity.");
expect(migration.includes("calendar_visual_requests_opportunity_id_uidx"), "The durable visual request schema must support exact campaign targets.");
expect(migration.includes("from public.brand_campaign_opportunities opportunity") && migration.includes("calendar-generic.svg"), "Existing calendars with generic art must be requeued during migration.");
expect(glyphs.includes('return "gaming"') && glyphs.includes('return "winter"') && glyphs.includes('return "office"'), "Temporary calendar art must already vary by campaign theme.");
expect(labels.includes('"automation.purpose.relationship"') && builtIn.includes('"brand.result.title": "Din varumärkesprofil är klar"'), "New planning and brand-result copy must be localized.");
expect(i18n.includes("Never leak the English source pack") && i18n.includes('TRANSLATION_CACHE_VERSION = "v12"'), "Non-English workspaces must retry instead of leaking English fallbacks.");

console.log("v143.32 corrected timezone, planning semantics, brand experience, localization and calendar visuals checks passed.");
