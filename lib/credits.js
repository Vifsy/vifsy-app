import { getDefaultContentCreditCost } from "./contentEconomics";

export const CREDIT_COSTS = Object.freeze({
  CUSTOM_UPLOADED_IMAGE: 10,
  WEBSITE_PRODUCT_IMAGE: 10,
  AI_IMAGE: 10,
  AI_PRODUCT_AD: 20,
  ANIMATED_PRODUCT_VIDEO: 50,
  AI_PRODUCT_VIDEO: 50,
  PRODUCT_CAROUSEL: 20,
});

function explicitCreditCost(input = {}) {
  const candidates = [
    input.configuredCreditCost,
    input.configured_credit_cost,
    input.customer_credit_cost,
    input.creditCost,
    input.credit_cost,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.max(1, Math.round(parsed));
  }

  return null;
}

export function getCreditCostForContent(input = {}) {
  const explicit = explicitCreditCost(input);
  if (explicit) return explicit;

  const contentTypeId = String(
    input.contentTypeId || input.content_type_id || ""
  ).toLowerCase();
  const contentFormat = String(
    input.contentFormat || input.content_format || ""
  ).toLowerCase();
  const imageSource = String(
    input.imageSource || input.image_source || ""
  ).toLowerCase();
  const usesWebsiteContent = Boolean(
    input.usesWebsiteContent ?? input.uses_website_content
  );
  const generateImage = Boolean(
    input.generateImage ?? input.generate_image
  );

  if (contentTypeId) {
    const configuredDefault = getDefaultContentCreditCost(contentTypeId);
    if (configuredDefault) return configuredDefault;
  }

  if (
    contentFormat === "carousel" ||
    contentTypeId === "carousel_website_item" ||
    imageSource === "website_carousel"
  ) {
    return CREDIT_COSTS.PRODUCT_CAROUSEL;
  }

  if (contentTypeId === "ai_product_video") {
    return CREDIT_COSTS.AI_PRODUCT_VIDEO;
  }

  if (
    contentFormat === "animated_video" ||
    contentTypeId === "animated_website_item"
  ) {
    return CREDIT_COSTS.ANIMATED_PRODUCT_VIDEO;
  }

  if (contentTypeId === "manual_prompt" && imageSource === "uploaded") {
    return CREDIT_COSTS.CUSTOM_UPLOADED_IMAGE;
  }

  if (contentTypeId === "website_item_text_ad") {
    return CREDIT_COSTS.AI_PRODUCT_AD;
  }

  if (
    usesWebsiteContent ||
    imageSource === "website" ||
    contentTypeId === "website_item"
  ) {
    return CREDIT_COSTS.WEBSITE_PRODUCT_IMAGE;
  }

  if (generateImage || imageSource === "ai" || contentTypeId === "manual_prompt") {
    return CREDIT_COSTS.AI_IMAGE;
  }

  return CREDIT_COSTS.AI_IMAGE;
}

export function getCreditCostForCampaignSourceMode(sourceMode) {
  const normalized = String(sourceMode || "").toLowerCase();

  if (normalized === "website_carousel") {
    return CREDIT_COSTS.PRODUCT_CAROUSEL;
  }

  if (normalized === "website_product_ad") {
    return CREDIT_COSTS.AI_PRODUCT_AD;
  }

  if (normalized === "animated_website_item" || normalized === "animated_video") {
    return CREDIT_COSTS.ANIMATED_PRODUCT_VIDEO;
  }

  if (
    normalized === "website_product" ||
    normalized === "website_service" ||
    normalized === "mixed_campaign_and_website"
  ) {
    return CREDIT_COSTS.WEBSITE_PRODUCT_IMAGE;
  }

  return CREDIT_COSTS.AI_IMAGE;
}
