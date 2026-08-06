import fs from "node:fs";
import { resolveCalendarVisualTheme, scoreCalendarVisualAsset } from "../lib/calendarVisualThemes.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const migration = read("supabase/v143_36_calendar_visual_metadata_repair.sql");
const worker = read("app/api/cron/generate-calendar-visuals/route.js");

expect(migration.includes("join public.brand_campaign_opportunities opportunity"), "Existing images must inherit metadata from their source campaign.");
expect(migration.includes("request.asset_id") && migration.includes("request.opportunity_id"), "The repair must follow the durable image-request relationship.");
expect(migration.includes("calendar_visual_library_audit") && migration.includes("calendar_visual_theme_inventory"), "The migration must expose non-destructive audit reports.");
expect(!migration.match(/delete\s+from\s+public\.calendar_visual_assets/i), "The metadata repair must never delete existing image records.");
expect(worker.includes("syncUntrackedStorageAssets") && worker.includes("getPublicUrl(path)"), "Untracked Storage objects must be registered without renaming their URLs.");
expect(worker.includes("CALENDAR_THEME_ASSET_TARGET") && worker.includes("inventory.count >= target"), "Per-theme generation must stop before duplicate themes consume the global library.");
expect(worker.includes("count || 0) >= 150"), "Storage synchronization must respect the 150-asset hard cap.");
expect(worker.includes("classifyUnresolvedAssets") && worker.includes("openai_vision_once"), "Only unresolved legacy images should receive one-time visual classification.");
expect(worker.includes("classification_attempts") && worker.includes("attempt >= 3"), "Failed classification must be bounded and must not create recurring OpenAI cost.");

const christmas = resolveCalendarVisualTheme({ visual_theme_key: "christmas", title: "Giáng sinh" });
expect(christmas.themeKey === "christmas", "Worldwide campaign labels must resolve through canonical English metadata.");
expect(scoreCalendarVisualAsset({ theme_key: "christmas", theme_tags: ["christmas", "gifts"] }, christmas) >= 100, "Canonical metadata must drive matching instead of filenames.");

console.log("v143.36 calendar image metadata repair checks passed.");
