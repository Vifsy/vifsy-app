import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPublicHttpUrl } from "../lib/security.js";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
const readProjectFile = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

async function testHostnameResolutionCache() {
  const resolutionCache = new Map();
  const timings = [];
  let lookupCount = 0;
  const resolveHostname = async () => {
    lookupCount += 1;
    return [{ address: "93.184.216.34", family: 4 }];
  };
  const options = {
    resolutionCache,
    resolveHostname,
    onResolutionTiming: (timing) => timings.push(timing),
  };

  await assertPublicHttpUrl("https://shop.example/products", options);
  await assertPublicHttpUrl("https://shop.example/categories", options);

  assert.equal(
    lookupCount,
    1,
    "the same hostname must only be resolved once within one analysis"
  );
  assert.equal(resolutionCache.size, 1);
  assert.equal(timings.length, 2);
  assert.equal(timings[0].cacheHit, false);
  assert.equal(timings[1].cacheHit, true);

  await assertPublicHttpUrl("https://assets.example/products", options);
  assert.equal(
    lookupCount,
    2,
    "a different hostname must still receive its own safety verification"
  );

  await assert.rejects(
    () => assertPublicHttpUrl("http://127.0.0.1/private", options),
    /Private or internal IP addresses/u
  );
}

function testAnalysisWiringAndDiagnostics() {
  const engine = readProjectFile(
    "app/api/analyze-brand/brandAnalysisEngine.js"
  );

  assert.match(engine, /const resolutionCache = new Map\(\);/u);
  assert.match(
    engine,
    /fetchWebsiteHtml\(websiteUrl,\s*\{\s*resolutionCache,\s*onResolutionTiming,/su
  );
  assert.match(
    engine,
    /fetchProductSourceCandidates\(\{[\s\S]*?resolutionCache,[\s\S]*?onResolutionTiming,/u
  );
  assert.match(engine, /phase: "website_homepage"|runTimedPhase\("website_homepage"/u);
  assert.match(engine, /"website_context_pages"/u);
  assert.match(engine, /"openai_brand_strategy"/u);
  assert.match(engine, /Brand analysis job completed/u);
  assert.match(engine, /hostnameResolutionCacheEntries/u);
}

function testStudioPageTheme() {
  const globals = readProjectFile("app/globals.css");
  const theme = readProjectFile(
    "app/styles/39-v143-15-studio-pages.css"
  );
  const settingsPage = readProjectFile("app/settings/page.jsx");

  assert.match(globals, /39-v143-15-studio-pages\.css/u);
  assert.match(settingsPage, /className="settings-v14315-page"/u);

  for (const selector of [
    ".brand-profile-page",
    ".social-v74-page",
    ".settings-v14315-page",
    ".campaign-planner-clean",
    ".brand-profile-layout",
    ".social-v74-grid",
    ".planner-schedule-card",
  ]) {
    assert.ok(
      theme.includes(selector),
      `the studio theme must cover ${selector}`
    );
  }

  assert.match(theme, /@media \(max-width: 900px\)/u);
  assert.match(theme, /@media \(max-width: 640px\)/u);
  assert.match(theme, /grid-template-columns: minmax\(0, 1fr\)/u);
  assert.match(theme, /font-size: 16px !important;/u);
}

await testHostnameResolutionCache();
testAnalysisWiringAndDiagnostics();
testStudioPageTheme();

console.log("v143.15 analysis speed and studio page checks passed.");
