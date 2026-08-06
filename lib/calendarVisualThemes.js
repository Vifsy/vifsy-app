const THEME_ALIASES = [
  ["christmas", ["christmas", "xmas", "jul", "julklapp", "weihnacht", "navidad", "natal", "natale", "noel", "noël", "joulu", "kerst", "boze narodzenie", "boże narodzenie", "giang sinh", "giáng sinh", "рождеств", "圣诞", "聖誕", "クリスマス", "크리스마스", "عيد الميلاد"]],
  ["new_year", ["new year", "new-year", "nyar", "nyår", "nouvel an", "ano nuevo", "año nuevo", "capodanno", "neujahr", "tet", "tết", "新年", "正月", "새해"]],
  ["lunar_new_year", ["lunar new year", "chinese new year", "tet", "tết", "春节", "春節", "설날"]],
  ["easter", ["easter", "pask", "påsk", "paques", "pâques", "pascua", "pasqua", "ostern", "复活节", "復活節", "イースター", "부활절"]],
  ["halloween", ["halloween", "all hallows", "万圣节", "萬聖節", "ハロウィン", "할로윈"]],
  ["black_friday", ["black friday", "black week", "svarta fredagen"]],
  ["cyber_monday", ["cyber monday"]],
  ["valentines_day", ["valentine", "alla hjartans", "alla hjärtans", "san valentin", "saint valentin", "情人节", "バレンタイン"]],
  ["mothers_day", ["mother's day", "mothers day", "mors dag", "muttertag", "fete des meres", "día de la madre", "母亲节", "母の日"]],
  ["fathers_day", ["father's day", "fathers day", "fars dag", "vatertag", "fete des peres", "día del padre", "父亲节", "父の日"]],
  ["back_to_school", ["back to school", "back-to-school", "skolstart", "rentrée", "regreso a clases", "schulanfang", "开学", "新学期"]],
  ["ramadan", ["ramadan", "ramazan", "رمضان"]],
  ["eid", ["eid", "عيد الفطر", "عيد الأضحى", "bayram"]],
  ["diwali", ["diwali", "deepavali", "दिवाली", "दीपावली"]],
  ["hanukkah", ["hanukkah", "chanukah", "חנוכה"]],
  ["gaming", ["gaming", "e-sport", "esport", "game", "spel", "gamer"]],
  ["sustainability", ["sustainability", "sustainable", "hallbar", "hållbar", "recycling", "atervinning", "återvinning", "eco", "miljo", "miljö"]],
  ["office", ["office", "workplace", "home office", "hemmakontor", "distansarbete", "bureau", "oficina"]],
  ["technology", ["technology", "technical", "teknik", "electronics", "elektronik", "digital"]],
  ["winter", ["winter", "vinter", "hiver", "invierno", "inverno", "冬", "겨울"]],
  ["summer", ["summer", "sommar", "ete", "été", "verano", "estate", "夏", "여름"]],
  ["spring", ["spring", "var", "vår", "printemps", "primavera", "春"]],
  ["autumn", ["autumn", "fall season", "host", "höst", "automne", "otoño", "秋"]],
  ["flowers", ["flower", "flowers", "blomm", "fleur", "flores", "花"]],
  ["gifts", ["gift", "gifts", "present", "cadeau", "regalo", "geschenk", "gåva", "gava"]],
  ["sale", ["sale", "sales", "discount", "rea", "rabatt", "soldes", "oferta", "促销"]],
  ["health", ["health", "wellness", "vard", "vård", "hälsa", "halsa", "sante", "salud"]],
  ["local_event", ["local event", "lokalt evenemang", "festival", "community"]],
];

export const CANONICAL_VISUAL_THEMES = new Set([
  ...THEME_ALIASES.map(([key]) => key),
  "seasonal", "education", "awareness", "product_discovery", "service", "food", "fashion", "beauty", "sports", "travel", "family", "general",
]);

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeVisualThemeKey(value) {
  const key = normalizeSearchText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return CANONICAL_VISUAL_THEMES.has(key) ? key : "";
}

export function normalizeVisualThemeTags(values) {
  const result = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const tag = normalizeSearchText(raw).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (tag && tag.length <= 40 && !result.includes(tag)) result.push(tag);
    if (result.length >= 10) break;
  }
  return result;
}

export function resolveCalendarVisualTheme(opportunity = {}) {
  const aiKey = normalizeVisualThemeKey(opportunity.visual_theme_key);
  const text = normalizeSearchText([
    opportunity.title,
    opportunity.slug,
    opportunity.description,
    opportunity.event_type,
    opportunity.campaign_category,
    opportunity.image_guidance,
  ].filter(Boolean).join(" "));
  let themeKey = aiKey;
  if (!themeKey) {
    themeKey = THEME_ALIASES.find(([, aliases]) => aliases.some((alias) => text.includes(normalizeSearchText(alias))))?.[0] || "";
  }
  if (!themeKey) {
    if (String(opportunity.event_type || "").includes("season")) themeKey = "seasonal";
    else if (String(opportunity.campaign_category || "").includes("education")) themeKey = "education";
    else if (String(opportunity.campaign_category || "").includes("awareness")) themeKey = "awareness";
    else if (String(opportunity.campaign_category || "").includes("product")) themeKey = "product_discovery";
    else if (String(opportunity.website_content_strategy || "") === "service") themeKey = "service";
    else themeKey = "general";
  }
  const tags = normalizeVisualThemeTags([
    themeKey,
    ...(Array.isArray(opportunity.visual_theme_tags) ? opportunity.visual_theme_tags : []),
    opportunity.event_type,
    opportunity.campaign_category,
    opportunity.website_content_strategy,
  ]);
  return { themeKey, tags: tags.includes(themeKey) ? tags : [themeKey, ...tags].slice(0, 10) };
}

export function scoreCalendarVisualAsset(asset, requestedTheme) {
  const assetKey = normalizeVisualThemeKey(asset?.theme_key) || normalizeVisualThemeKey(asset?.alt_text);
  const assetTags = new Set(normalizeVisualThemeTags(asset?.theme_tags));
  const requestedTags = normalizeVisualThemeTags(requestedTheme?.tags);
  let score = assetKey && assetKey === requestedTheme?.themeKey ? 100 : 0;
  for (const tag of requestedTags) if (assetTags.has(tag)) score += tag === requestedTheme?.themeKey ? 30 : 8;
  return score;
}
