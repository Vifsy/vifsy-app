import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { calculateOpenAICost, wrapOpenAIForCostTracking } from "../lib/generationCostTracking.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
};
const approx = (actual, expected, epsilon = 1e-9) => Math.abs(Number(actual) - Number(expected)) <= epsilon;

const imageCost = calculateOpenAICost({
  operation: "images.edit",
  request: { model: "gpt-image-2" },
  response: {
    id: "img_cost_test",
    usage: {
      input_tokens: 300,
      input_tokens_details: { text_tokens: 100, image_tokens: 200 },
      output_tokens: 1000,
      total_tokens: 1300,
    },
  },
});
assert(approx(imageCost.amount, 0.01605), "GPT-Image-2 cost uses current API text/image/output token rates");
assert(imageCost.exact === true, "GPT-Image-2 usage with a complete token split is exact");

const searchCost = calculateOpenAICost({
  operation: "responses.create",
  request: { model: "gpt-4.1-mini" },
  response: {
    id: "resp_search_test",
    usage: { input_tokens: 1000, output_tokens: 100, total_tokens: 1100 },
    output: [{ type: "web_search_call", id: "ws_1" }],
  },
});
// 1000 model input + 100 output + $0.01 tool call + fixed 8000 search-content input tokens.
const expectedSearch = (1000 * 0.4 + 100 * 1.6 + 8000 * 0.4) / 1_000_000 + 0.01;
assert(approx(searchCost.amount, expectedSearch), "GPT-4.1-mini web search includes the fixed 8k billed search-content tokens plus tool fee");
assert(searchCost.usage.billed_web_search_content_tokens === 8000, "web-search billed content tokens are exposed in the admin ledger usage payload");

const recorded = [];
const tracker = {
  async recordOpenAI(operation, request, response) {
    recorded.push({ operation, request, response });
    return { persisted: true };
  },
};
const rawOpenAI = {
  responses: {
    async create(request) {
      return { id: "resp_background_1", model: request.model, background: true, status: "queued", usage: null };
    },
    async retrieve(id) {
      return {
        id,
        model: "gpt-4.1-mini",
        background: true,
        status: "completed",
        usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
        output: [],
      };
    },
  },
};
const trackedOpenAI = wrapOpenAIForCostTracking(rawOpenAI, () => tracker);
await trackedOpenAI.responses.create({ model: "gpt-4.1-mini", background: true });
await trackedOpenAI.responses.retrieve("resp_background_1");
assert(recorded.length === 2, "background create and final retrieve are both observed by the cost wrapper");
assert(recorded.every((entry) => entry.operation === "responses.background"), "background create and retrieve canonicalize to the same ledger operation");
assert(recorded[1].request.response_id === "resp_background_1", "background retrieve preserves the provider response id in tracking context");

const trackerSource = read("lib/generationCostTracking.js");
const runtime = read("app/api/cron/run-automations/route.js");
const adminProduct = read("app/api/admin/post-approvals/regenerate-product/route.js");
const adminAny = read("app/api/admin/post-approvals/regenerate-any/route.js");
const adminUi = read("app/admin/post-approvals/page.jsx");
const adminApi = read("app/api/admin/post-approvals/route.js");

assert(trackerSource.includes("missing_expected_events"), "summary persists missing expected provider events");
assert(trackerSource.includes('missingExpectedEvents.push("openai:gpt-image-2:image_generation")'), "ready/generating GPT-Image posts cannot be marked exact without an image-generation cost event");
assert(trackerSource.includes("persisted: !error"), "failed ledger writes remain retryable instead of being marked tracked");
assert(!trackerSource.includes("ignoreDuplicates: true"), "later final provider usage can replace an earlier partial cost row");
assert(runtime.match(/ensureOpenAIResponseCostTracked\(/g)?.length >= 4, "primary GPT image generators explicitly ensure their image cost is persisted without a second image generation");
assert(runtime.includes("activeGenerationCostTracker\n            );") || runtime.includes("activeGenerationCostTracker\r\n            );"), "automatic generation forwards the active tracker to image generators");
assert(adminProduct.includes("generatedContent, costTracker") || adminProduct.includes("generatedContent,\n        costTracker"), "admin product regeneration forwards the cost tracker to image generation");
assert(adminAny.includes("generateAutomationImage(openai, enhancedRule, generatedContent, costTracker)"), "generic admin regeneration forwards the cost tracker to image generation");
assert(adminUi.includes("formatGenerationCostEventLabel(event)"), "admin cost breakdown identifies the provider/model/operation instead of hiding image edits");
assert(adminApi.includes("getAdminMissingExpectedCostEvents"), "admin also downgrades legacy summaries to partial when an expected image/video event is absent");
assert(adminApi.includes("text_model_used, image_model_used"), "admin fetch includes model metadata needed to validate old cost summaries");

if (process.exitCode) process.exit(process.exitCode);
console.log("v144.155 complete generation-cost metering checks passed.");
