import fs from "node:fs";

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const page = fs.readFileSync(new URL("../app/automation/page.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/styles/95-v144-99-campaign-formats-and-name.css", import.meta.url), "utf8");
const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

expect(page.includes('function addCampaignSlot(selectedContentTypeId = "")'), "campaign slot insertion must accept an optional selected format");
expect(page.includes('getCampaignSourceModeForSelectedContentType(selectedType.id)'), "selected campaign formats must preserve campaign source/product logic");
expect(page.includes('buildSelectedCampaignFormatPrompt('), "selected formats must keep the campaign prompt and add format-specific instructions");
expect(page.includes('buildSelectedCampaignImagePrompt('), "selected formats must keep campaign image context and format-specific visual instructions");
expect(page.includes('selectedType?.id || getCampaignSlotContentTypeId(contentSourceMode)'), "new campaign slots must retain the explicitly chosen content type");
expect(page.includes('selectedType?.animationStyle || getCampaignSlotAnimationStyle(contentSourceMode)'), "AI/video formats must retain their own animation behavior in campaigns");
expect(page.includes('postPlanItem.scheduled_date = startDate'), "manually added campaign formats must keep exact campaign schedule facts");
expect(page.includes('onClick={() => requestFormatPreview(item.id, { fromAllFormats: true })}'), "campaign content cards must be clickable");
expect(page.includes('addCampaignSlot(selectedFormatPreview.id)'), "format confirmation must add the selected format through campaign logic");
expect(page.includes('exploreFormatItems.filter((item) => planCreationMode !== "campaign" || item.kind === "content_type")'), "campaign format browser must only show campaign-safe content types");
expect(page.includes('campaignOpportunity.title'), "calendar campaign post badges must use the actual campaign name");
expect(page.includes('plan-v14499-campaign-name-badge'), "campaign-name badge styling hook must be present");
expect(css.includes('text-overflow: ellipsis'), "long campaign names must not break responsive layout");
expect(css.includes('@media (max-width: 760px)'), "campaign-name badge and interactions must include mobile safeguards");
expect(globals.includes('95-v144-99-campaign-formats-and-name.css'), "v144.99 stylesheet must load after v144.98");

console.log("v144.99 campaign format and badge checks passed");
