import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  bundledProductFontStatus,
  escapeProductSvg,
  getProductTypographyProfile,
  layoutProductTitle,
} from "../lib/globalProductTypography.js";

assert.equal(bundledProductFontStatus.configured, true, "bundled Fontconfig must be configured before Sharp loads");
const { default: sharp } = await import("sharp");

const root = process.cwd();
const routeSource = readFileSync(path.join(root, "app/api/cron/run-automations/route.js"), "utf8");
const requiredFonts = [
  "NotoSans-Regular.ttf",
  "NotoSansArabic-Regular.ttf",
  "NotoSansHebrew-Regular.ttf",
  "NotoSansBengali-Regular.ttf",
  "NotoSansDevanagariUI-Regular.ttf",
  "NotoSansThai-Regular.ttf",
  "NotoSansKhmer-Regular.ttf",
  "NotoSansMyanmar-Regular.ttf",
  "NotoSansSinhalaUI-Regular.ttf",
  "ja.ttf",
  "ko.ttf",
  "zh-hans.ttf",
  "zh-hant.ttf",
];
for (const font of requiredFonts) {
  assert.ok(existsSync(path.join(root, "assets/fonts/noto", font)), `missing bundled font: ${font}`);
}

const cases = [
  { title: "Varmfodrad vinterjacka för barn", script: "global", direction: "ltr" },
  { title: "معطف شتوي دافئ للأطفال", script: "arabic", direction: "rtl" },
  { title: "מעיל חורף חם לילדים", script: "hebrew", direction: "rtl" },
  { title: "बच्चों के लिए गर्म सर्दियों की जैकेट", script: "devanagari", direction: "ltr" },
  { title: "শিশুদের উষ্ণ শীতের জ্যাকেট", script: "bengali", direction: "ltr" },
  { title: "เสื้อกันหนาวเด็กแบบอบอุ่น", script: "thai", direction: "ltr" },
  { title: "កំពូលអាវរងារកុមារ", script: "khmer", direction: "ltr" },
  { title: "子供用の暖かい冬用ジャケット", script: "japanese", direction: "ltr" },
  { title: "아동용 따뜻한 겨울 재킷", script: "hangul", direction: "ltr" },
  { title: "儿童保暖冬季夹克", script: "han", direction: "ltr" },
];

for (const sample of cases) {
  const profile = getProductTypographyProfile(sample.title, sample.script === "han" ? "zh-CN" : "");
  assert.equal(profile.script, sample.script);
  assert.equal(profile.direction, sample.direction);
  const layout = layoutProductTitle(sample.title, { maxWidth: 390, maxHeight: 184 });
  assert.ok(layout.lines.length > 0);
  assert.ok(layout.fontSize >= 19 && layout.fontSize <= 44);
  const sourceLetters = sample.title.replace(/\s+/gu, "");
  const renderedLetters = layout.lines.join("").replace(/\s+/gu, "");
  assert.equal(renderedLetters, sourceLetters, `title must not be translated or truncated: ${sample.title}`);

  const isRtl = profile.direction === "rtl";
  const spans = layout.lines.map((line, index) => `<tspan x="${isRtl ? 760 : 40}" dy="${index ? layout.lineHeight : 0}">${escapeProductSvg(line)}</tspan>`).join("");
  const svg = `<svg width="800" height="240" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="240" fill="#fff"/><text x="${isRtl ? 760 : 40}" y="70" font-family="${profile.family}, Noto Sans, sans-serif" font-size="${layout.fontSize}" font-weight="700" fill="#111" direction="${profile.direction}" unicode-bidi="plaintext" text-anchor="${isRtl ? "end" : "start"}">${spans}</text></svg>`;
  const rendered = await sharp(Buffer.from(svg)).png().toBuffer();
  assert.ok(rendered.length > 500, `Sharp must render ${sample.script}`);
}

assert.match(routeSource, /timeout:\s*45_000,\s*maxRetries:\s*0/);
assert.match(routeSource, /local_packshot_fallback/);
assert.match(routeSource, /analysis_timeout_local_fallback/);
assert.match(routeSource, /middle_left/);
assert.match(routeSource, /middle_right/);
assert.match(routeSource, /People and animals are allowed/);
assert.match(routeSource, /product_label_font_family/);
assert.match(routeSource, /bundled_product_fonts_configured/);

console.log("v143.27 global product typography tests passed");
