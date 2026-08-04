import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const FONT_ROOT = path.join(process.cwd(), "assets", "fonts", "noto");

function fontConfigPath(value) {
  return String(value || "").replace(/\\/g, "/");
}

export function configureBundledProductFonts() {
  if (!existsSync(FONT_ROOT)) return { configured: false, fontRoot: FONT_ROOT };
  const configRoot = path.join(os.tmpdir(), "spreelo-fontconfig");
  const cacheRoot = path.join(os.tmpdir(), "spreelo-fontconfig-cache");
  const configFile = path.join(configRoot, "fonts.conf");
  mkdirSync(configRoot, { recursive: true });
  mkdirSync(cacheRoot, { recursive: true });
  const config = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontConfigPath(FONT_ROOT)}</dir>
  <dir>/var/task/assets/fonts/noto</dir>
  <dir>/var/task/fonts</dir>
  <dir>/var/task/.fonts</dir>
  <dir>/tmp/fonts</dir>
  <cachedir>${fontConfigPath(cacheRoot)}</cachedir>
  <config></config>
</fontconfig>`;
  writeFileSync(configFile, config, "utf8");
  process.env.FONTCONFIG_FILE = configFile;
  process.env.FONTCONFIG_PATH = configRoot;
  process.env.XDG_CACHE_HOME = cacheRoot;
  return { configured: true, fontRoot: FONT_ROOT, configFile };
}

export const bundledProductFontStatus = configureBundledProductFonts();

const SCRIPT_PROFILES = [
  { script: "arabic", re: /\p{Script=Arabic}/u, family: "Noto Sans Arabic", direction: "rtl", width: 0.64 },
  { script: "hebrew", re: /\p{Script=Hebrew}/u, family: "Noto Sans Hebrew", direction: "rtl", width: 0.64 },
  { script: "devanagari", re: /\p{Script=Devanagari}/u, family: "Noto Sans Devanagari UI", direction: "ltr", width: 0.72 },
  { script: "bengali", re: /\p{Script=Bengali}/u, family: "Noto Sans Bengali", direction: "ltr", width: 0.72 },
  { script: "thai", re: /\p{Script=Thai}/u, family: "Noto Sans Thai", direction: "ltr", width: 0.72 },
  { script: "khmer", re: /\p{Script=Khmer}/u, family: "Noto Sans Khmer", direction: "ltr", width: 0.76 },
  { script: "myanmar", re: /\p{Script=Myanmar}/u, family: "Noto Sans Myanmar", direction: "ltr", width: 0.76 },
  { script: "sinhala", re: /\p{Script=Sinhala}/u, family: "Noto Sans Sinhala UI", direction: "ltr", width: 0.76 },
  { script: "georgian", re: /\p{Script=Georgian}/u, family: "Noto Sans Georgian", direction: "ltr", width: 0.66 },
  { script: "hangul", re: /\p{Script=Hangul}/u, family: "Source Han Sans KR Medium", direction: "ltr", width: 1 },
  { script: "japanese", re: /[\p{Script=Hiragana}\p{Script=Katakana}]/u, family: "Source Han Sans JP Medium", direction: "ltr", width: 1 },
  { script: "han", re: /\p{Script=Han}/u, family: "Source Han Sans CN Medium", direction: "ltr", width: 1 },
];

export function getProductTypographyProfile(value, languageHint = "") {
  const text = String(value || "");
  const profile = SCRIPT_PROFILES.find((candidate) => candidate.re.test(text)) || {
    script: "global",
    family: "Noto Sans",
    direction: "ltr",
    width: 0.58,
  };
  if (profile.script !== "han") return { ...profile };
  const normalizedLanguage = String(languageHint || "").toLowerCase();
  const traditional = /(^|[-_])(tw|hk|mo|hant)([-_]|$)/.test(normalizedLanguage);
  return {
    ...profile,
    family: traditional ? "Source Han Sans TC Medium" : "Source Han Sans CN Medium",
  };
}

function getGraphemes(value, locale = "und") {
  const text = String(value || "");
  if (typeof Intl?.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

function graphemeWidth(grapheme, profile) {
  if (/\s/u.test(grapheme)) return 0.32;
  if (/\p{Extended_Pictographic}/u.test(grapheme)) return 1;
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(grapheme)) return 1;
  if (/\p{Punctuation}/u.test(grapheme)) return Math.min(profile.width, 0.45);
  return profile.width;
}

function measureEm(value, profile) {
  return getGraphemes(value).reduce((total, grapheme) => total + graphemeWidth(grapheme, profile), 0);
}

function segmentWords(value, locale = "und") {
  const text = String(value || "");
  if (typeof Intl?.Segmenter === "function") {
    const segments = Array.from(new Intl.Segmenter(locale, { granularity: "word" }).segment(text));
    if (segments.some((entry) => entry.isWordLike)) return segments.map((entry) => entry.segment);
  }
  return text.split(/(\s+)/u).filter(Boolean);
}

function splitOverlongSegment(segment, maxEm, profile) {
  const chunks = [];
  let current = "";
  for (const grapheme of getGraphemes(segment)) {
    if (current && measureEm(current + grapheme, profile) > maxEm) {
      chunks.push(current);
      current = grapheme;
    } else {
      current += grapheme;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function wrapProductTitle(value, { fontSize, maxWidth, maxLines = 4, languageHint = "" } = {}) {
  const title = String(value || "").replace(/\s+/gu, " ").trim();
  const profile = getProductTypographyProfile(title, languageHint);
  if (!title) return { lines: [], profile, complete: true };
  const maxEm = Math.max(4, Number(maxWidth || 320) / Math.max(16, Number(fontSize || 32)));
  const rawSegments = segmentWords(title, languageHint || "und");
  const segments = rawSegments.flatMap((segment) => measureEm(segment, profile) > maxEm
    ? splitOverlongSegment(segment, maxEm, profile)
    : [segment]);
  const lines = [];
  let current = "";
  for (const segment of segments) {
    const proposed = current + segment;
    if (current.trim() && measureEm(proposed, profile) > maxEm) {
      lines.push(current.trim());
      current = segment.trimStart();
    } else {
      current = proposed;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return { lines, profile, complete: lines.length <= maxLines };
}

export function layoutProductTitle(value, { maxWidth = 350, maxHeight = 176, languageHint = "" } = {}) {
  const sizes = [44, 40, 36, 32, 29, 26, 23, 21];
  for (const fontSize of sizes) {
    const lineHeight = Math.round(fontSize * 1.22);
    const maxLines = Math.max(1, Math.floor((maxHeight - 24) / lineHeight));
    const wrapped = wrapProductTitle(value, { fontSize, maxWidth: maxWidth - 28, maxLines, languageHint });
    if (wrapped.complete && wrapped.lines.length <= maxLines) {
      return { ...wrapped, fontSize, lineHeight, maxLines };
    }
  }
  const fontSize = 19;
  const lineHeight = 24;
  const wrapped = wrapProductTitle(value, {
    fontSize,
    maxWidth: maxWidth - 24,
    maxLines: Math.max(1, Math.floor((maxHeight - 20) / lineHeight)),
    languageHint,
  });
  return { ...wrapped, fontSize, lineHeight, maxLines: wrapped.lines.length };
}

export function escapeProductSvg(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
