import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const globals = read("app/globals.css");
const styles = read("app/styles/50-v143-38-premium-responsive-experience.css");
const login = read("app/login/page.jsx");
const brand = read("app/brand/page.jsx");
const automation = read("app/automation/page.jsx");
const english = read("lib/i18n/defaultLabels.js");
const swedish = read("lib/i18n/builtInLocaleLabels.js");
const brandImage = path.join(root, "public/backgrounds/spreelo-brand-intelligence-v143-38.png");

expect(globals.includes('50-v143-38-premium-responsive-experience.css'), "v143.38 stylesheet is not imported");
expect(fs.existsSync(brandImage) && fs.statSync(brandImage).size > 100_000, "brand intelligence hero image is missing or empty");

expect(styles.includes(':has(.campaign-planner-clean)'), "campaign studio is not scoped to the campaign route");
expect(styles.includes('max-width: none !important'), "campaign studio is not released from the old narrow width");
expect(styles.includes('@media (min-width: 901px) and (max-width: 1180px)'), "tablet campaign breakpoint is missing");
expect(styles.includes('grid-template-columns: repeat(2, minmax(0,1fr))'), "mobile campaign layout is not stacked safely");
expect(automation.includes('campaign-v14335-shell'), "campaign reference layout is missing");

expect(styles.includes('spreelo-brand-intelligence-v143-38.png'), "brand profile does not use the new hero image");
expect(styles.includes('.brand-profile-summary-grid'), "brand profile premium card grid is missing");
expect(styles.includes('backdrop-filter: blur('), "premium glass treatment is missing");
expect(brand.includes('brand-profile-summary-card narrative'), "brand narrative cards are missing");

expect(login.includes('login-refresh-mobile-ai-label'), "mobile/tablet AI visual label is missing");
expect(login.includes('login.aiAssistantBadge'), "AI assistant badge is not translated");
expect(english.includes('"login.aiAssistantBadge": "AI Assistant"'), "English AI assistant label is missing");
expect(swedish.includes('"login.aiAssistantBadge": "AI-ASSISTENT"'), "Swedish AI assistant label is missing");
expect(!login.includes('<Sparkles size={17} aria-hidden="true" />\n              </span>\n              <div><strong>SPREELO AI</strong>'), "decorative login sparkle is still rendered");

console.log("v143.38 premium responsive experience checks passed.");
