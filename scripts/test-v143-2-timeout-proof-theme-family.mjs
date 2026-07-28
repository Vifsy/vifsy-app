import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluateCampaignFallbackEligibility,
  expandCampaignThemeTerms,
  hasCampaignThemeFamilyMatch,
} from "../lib/campaignThemeFit.js";

const productionThemeTerms = [
  "julklapp",
  "julgava",
  "julpresent",
  "julfirande",
  "juldesign",
  "jultema",
  "julpynt",
  "julmotiv",
];
const expandedThemeTerms = expandCampaignThemeTerms(productionThemeTerms);

assert.ok(
  expandedThemeTerms.includes("jul"),
  "The shared semantic family root must survive the theme contract"
);

const productionTitles = [
  "Årets Julklapp? T-shirt",
  "Alla Heter Glenn I Göteborg - Förkläde",
  "Juluggla - Dam - T-shirt",
  "Jag Hatar Julen T-shirt",
  "Cavalier King Charles Jul - T-shirt",
  "Kudde Med Fyllning 45 x 45 cm",
  "Positivt Tänkande Keps",
  "Förkläde För Köket",
  "Fransk Bulldog Jul - T-shirt",
  "Sovande Jul-enhörning Hoodie",
  "Julosarius Kuddfodral 45 x 45 cm",
  "Heja Eslöv - Mössa",
  "Drake Jultröja - Barn - T-shirt",
  "Tomtekatt God Jul T-shirt",
  "Ukraina Keps",
  "Keps Baseboll Bleechfield",
  "Scarf-multifunktion",
  "Bandana",
  "Glad Tomte T-shirt",
  "Love Christmas - T-shirt",
  "Bad Santa T-shirt",
  "Merry Christmas Unicorn",
];
const themeMatchedTitles = productionTitles.filter((title) =>
  hasCampaignThemeFamilyMatch(title, expandedThemeTerms)
);

assert.ok(
  themeMatchedTitles.length >= 9,
  `Expected at least nine direct Christmas-family products, found ${themeMatchedTitles.length}`
);
assert.ok(themeMatchedTitles.includes("Juluggla - Dam - T-shirt"));
assert.ok(themeMatchedTitles.includes("Sovande Jul-enhörning Hoodie"));
assert.ok(themeMatchedTitles.includes("Drake Jultröja - Barn - T-shirt"));
assert.ok(themeMatchedTitles.includes("Tomtekatt God Jul T-shirt"));
assert.equal(
  hasCampaignThemeFamilyMatch("Anime barn T-shirt", expandedThemeTerms),
  false
);

const usedTitle = "Årets Julklapp? T-shirt";
const timeoutFallbackSelection = productionTitles
  .filter((title) => title !== usedTitle)
  .filter((title) =>
    evaluateCampaignFallbackEligibility({
      explicitlyRejected: false,
      hasAiEvaluation: false,
      hasAiApproval: false,
      hasDirectThemeEvidence: hasCampaignThemeFamilyMatch(
        title,
        expandedThemeTerms
      ),
      productPageVerified: true,
      contextualProductMatches: 0,
      trustedCampaignSearch: true,
    }).approved
  )
  .slice(0, 5);
assert.equal(
  timeoutFallbackSelection.length,
  5,
  "An AI timeout must still leave five fresh direct-theme products"
);
assert.equal(
  evaluateCampaignFallbackEligibility({
    hasAiEvaluation: false,
    hasDirectThemeEvidence: false,
    productPageVerified: true,
    contextualProductMatches: 1,
    trustedCampaignSearch: true,
  }).approved,
  true,
  "A verified product-data match from a configured campaign search may survive an AI timeout"
);
assert.equal(
  evaluateCampaignFallbackEligibility({
    hasAiEvaluation: false,
    hasDirectThemeEvidence: false,
    productPageVerified: true,
    contextualProductMatches: 1,
    trustedCampaignSearch: false,
  }).approved,
  false,
  "A search result alone must not prove contextual campaign fit"
);
assert.equal(
  evaluateCampaignFallbackEligibility({
    explicitlyRejected: true,
    hasAiEvaluation: true,
    hasAiApproval: false,
    hasDirectThemeEvidence: true,
    productPageVerified: true,
    contextualProductMatches: 1,
    trustedCampaignSearch: true,
  }).approved,
  false,
  "An explicit product-level rejection must remain authoritative"
);

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);
const poolStart = route.indexOf("function buildCampaignSearchPoolItems");
const poolEnd = route.indexOf(
  "async function findProductUrlWithWebSearch",
  poolStart
);
const poolBlock = route.slice(poolStart, poolEnd);

assert.match(
  route,
  /expandCampaignThemeTerms\(suppliedThemeTerms\)/
);
assert.match(
  route,
  /evaluateCampaignFallbackEligibility\(\{/
);
assert.doesNotMatch(
  poolBlock,
  /\.filter\(\(item\) => getAiCampaignFitScore\(item\) !== null\)/
);
assert.match(
  poolBlock,
  /getCampaignProductSignalState\(item, rule\)[\s\S]{0,100}\.hasMeaningfulCampaignSignal/
);
assert.match(
  route,
  /resumedAfterWebsiteRateLimit &&[\s\S]{0,180}persistentPoolSeed\.length/
);
assert.match(
  route,
  /skipped intermediate AI review because five theme-fitting products were already verified/
);
assert.match(
  route,
  /CAMPAIGN_DELIVERABLE_POOL_MIN_ITEMS = CAROUSEL_PRODUCT_SLIDE_TARGET/
);
assert.match(
  route,
  /lockedCampaignSearchPoolItems\.length >=\s*CAMPAIGN_DELIVERABLE_POOL_MIN_ITEMS/
);
assert.doesNotMatch(
  route,
  /discoveredItems = \(await applyAiCampaignFitScores\([\s\S]{0,700}\.filter\(\(item\) => getAiCampaignFitScore\(item\) !== null\)/
);
assert.match(route, /digital_wallets\|sf_private_access_tokens/);
assert.match(route, /CAMPAIGN_AI_FAST_SCORE_LIMIT = 12/);

console.log(
  `v143.2 timeout-proof theme-family regression passed with ${themeMatchedTitles.length} direct production-title matches.`
);
