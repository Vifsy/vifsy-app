import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const migration = read("supabase/v143_36_1_visual_semantic_reclassification.sql");
const worker = read("app/api/cron/generate-calendar-visuals/route.js");

expect(migration.includes("classification_status = 'pending'") && migration.includes("where not is_generic"), "Every legacy image must be queued once for pixel-based classification.");
expect(migration.includes("visual_theme_classification_status = 'pending'"), "Campaign meaning must be reclassified independently from its text.");
expect(!migration.includes("t.t|") && !migration.includes("v.r|"), "Unsafe wildcard expressions for Tết and spring must be removed.");
expect(migration.includes("tết|tet") && migration.includes("vår|printemps"), "Safe multilingual fallbacks must remain available.");
expect(worker.includes("classifyUnresolvedAssets") && worker.includes("input_image"), "Image metadata must come from the actual image.");
expect(worker.includes("classifyUnresolvedCampaigns") && worker.includes("regardless of its language"), "Campaign metadata must come from multilingual campaign meaning.");
expect(worker.includes("Giáng sinh") && worker.includes("Karácsony") && worker.includes("Boże Narodzenie"), "The campaign classifier must explicitly unify worldwide Christmas labels.");
expect(worker.includes("reconcileClassifiedCampaignVisuals") && worker.includes("visual_theme_reconciled_at"), "Classified campaigns must be rematched to classified images.");
expect(worker.includes("visual_reclassification_pending"), "New jobs must wait safely while the one-time repair is active.");
expect(worker.includes('classification_status: "ready"') && worker.includes('classified_by: "generated_canonical_metadata"'), "Newly generated assets must remain immediately reusable.");

console.log("v143.36.1 semantic calendar image and campaign reclassification checks passed.");
