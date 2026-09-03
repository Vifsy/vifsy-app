import fs from "node:fs";

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const page = fs.readFileSync(new URL("../app/brand/page.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/styles/92-v144-96-brand-profile-logo-preview-responsive.css", import.meta.url), "utf8");
const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const labels = fs.readFileSync(new URL("../lib/i18n/defaultLabels.js", import.meta.url), "utf8");
const previewAsset = new URL("../public/brand/logo-preview-beauty-v144-96.webp", import.meta.url);

expect(page.includes("brand-v14496-content-grid"), "brand page must expose the responsive v144.96 content grid");
expect(page.includes("brand-v14496-logo-panel"), "brand page must expose the explanatory logo panel");
expect(page.includes("brand-v14496-social-card"), "brand page must include the example social post");
expect(page.includes('logoUrl ? <img src={logoUrl}'), "preview must switch to the uploaded logo when present");
expect(page.includes("{brandInitials}</span>"), "preview must have a brand-initial example logo before upload");
expect(page.includes('/brand/logo-preview-beauty-v144-96.webp'), "preview must use the bundled example creative");
expect(css.includes("overflow-wrap: anywhere"), "responsive layer must allow long copy to wrap");
expect(css.includes("@media (max-width: 760px)"), "responsive layer must include a mobile breakpoint");
expect(css.includes("grid-template-columns: 1fr !important"), "logo panel must stack at constrained widths");
expect(globals.includes('92-v144-96-brand-profile-logo-preview-responsive.css'), "v144.96 stylesheet must load after previous layers");
expect(labels.includes('"brand.logoPreviewUsesExample"'), "logo preview explanatory labels must be registered for translation");
expect(fs.existsSync(previewAsset), "example creative asset must be bundled");

console.log("v144.96 brand profile logo preview responsive checks passed");
