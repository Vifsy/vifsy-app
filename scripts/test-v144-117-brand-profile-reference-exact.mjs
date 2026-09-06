import fs from "node:fs";

const page = fs.readFileSync("app/brand/page.jsx", "utf8");
const css = fs.readFileSync("app/styles/104-v144-117-brand-profile-reference-exact.css", "utf8");
const globals = fs.readFileSync("app/globals.css", "utf8");
const labels = fs.readFileSync("lib/i18n/defaultLabels.js", "utf8");

const checks = [
  [page.includes('className="brand-profile-hero brand-v14495-hero brand-v144117-hero"'), "new reference hero is mounted"],
  [page.includes('<h2>{businessName || t("brand.heroTitle")}</h2>'), "hero brand name is dynamic"],
  [page.includes('brand-v144117-overview-card'), "overview strip is mounted"],
  [page.includes('brand-v144117-company-grid'), "company information grid is mounted"],
  [page.includes('brand-v144117-logo-panel'), "functional logo panel is retained"],
  [page.includes('{businessName || t("brand.brandSetup")}'), "preview account label is dynamic"],
  [page.includes('brandCreatedYear'), "creation year is derived from brand data"],
  [!page.includes('ChevronRight'), "dead read-only chevrons are removed"],
  [css.includes('backdrop-filter: blur(19px)'), "glass styling is present"],
  [css.includes('@media (max-width: 620px)'), "mobile breakpoint is present"],
  [css.includes('@media (max-width: 1120px)'), "tablet breakpoint is present"],
  [css.includes('@media (min-width: 1380px)'), "desktop spanning placement preview is present"],
  [page.includes('brand-v144117-social-caption'), "generic placement caption is present"],
  [globals.includes('104-v144-117-brand-profile-reference-exact.css'), "new CSS layer is imported last"],
  [labels.includes('"brand.heroArtTagline": "Stronger brands with AI"'), "hero art tagline is localized through i18n"],
  [labels.includes('"brand.companyInfoTitle": "Company information"'), "company heading is localized through i18n"],
];

let failed = 0;
for (const [ok, label] of checks) {
  if (ok) console.log(`✓ ${label}`);
  else {
    failed += 1;
    console.error(`✗ ${label}`);
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log("\nv144.117 brand profile reference checks passed.");
