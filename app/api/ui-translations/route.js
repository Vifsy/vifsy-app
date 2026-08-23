import { createClient } from "@supabase/supabase-js";
import {
  ALL_UI_NAMESPACES,
  DEFAULT_UI_LOCALE,
  getDefaultNamespaceLabels,
  getUiLanguageName,
  normalizeUiLocale,
} from "../../../lib/i18n/defaultLabels.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_NAMESPACES_PER_REQUEST = 4;
const TRANSLATION_CHUNK_SIZE = 80;
const TRANSLATION_CONCURRENCY = 4;
const TRANSLATION_FETCH_TIMEOUT_MS = 6500;

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function parseNamespaces(value) {
  const allowedNamespaces = new Set(ALL_UI_NAMESPACES);
  const namespaces = String(value || "common")
    .split(",")
    .map((namespace) => namespace.trim())
    .filter((namespace) => allowedNamespaces.has(namespace));

  return Array.from(new Set(["common", ...namespaces])).slice(0, MAX_NAMESPACES_PER_REQUEST);
}

function shouldRetranslateLabel({ defaultValue, translatedValue, locale }) {
  if (translatedValue === null || translatedValue === undefined) {
    return true;
  }

  const translatedText = String(translatedValue).trim();
  const defaultText = String(defaultValue || "").trim();

  if (!translatedText) {
    return true;
  }

  if (locale === DEFAULT_UI_LOCALE) {
    return false;
  }

  // Repair old language packs that were created while the UI was still falling
  // back to English. This is what can make one language, such as Swedish, stay
  // English even though newer languages work.
  if (defaultText && translatedText === defaultText) {
    return true;
  }

  return false;
}

function getLabelsNeedingTranslation(defaultLabels, translatedLabels, locale) {
  return Object.entries(defaultLabels).reduce((labelsNeedingTranslation, [key, value]) => {
    const translatedValue = translatedLabels?.[key];

    if (
      shouldRetranslateLabel({
        defaultValue: value,
        translatedValue,
        locale,
      })
    ) {
      labelsNeedingTranslation[key] = value;
    }

    return labelsNeedingTranslation;
  }, {});
}

function extractJsonObject(text) {
  const rawText = String(text || "").trim();

  if (!rawText) return {};

  try {
    return JSON.parse(rawText);
  } catch {}

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return {};
  }

  try {
    return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
  } catch {
    return {};
  }
}

function chunkLabelEntries(labels, chunkSize = TRANSLATION_CHUNK_SIZE) {
  const entries = Object.entries(labels || {});
  const chunks = [];
  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(Object.fromEntries(entries.slice(index, index + chunkSize)));
  }
  return chunks;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from(
    { length: Math.min(Math.max(1, concurrency), Math.max(1, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    }
  );

  await Promise.all(runners);
  return results;
}

async function translateLabelChunk({
  locale,
  languageName,
  namespace,
  labels,
  chunkIndex,
}) {
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openAiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TRANSLATION_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_UI_TRANSLATION_MODEL || "gpt-4.1-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You translate SaaS user interface labels. Return only valid JSON. Preserve all JSON keys exactly. Preserve placeholders like {brandName}, {count}, {year}, {date}, {days}, and {number} exactly. Keep translations concise and natural for buttons, menus, form labels, tooltips, empty states and dashboard UI. Do not translate brand names such as Spreelo.",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                target_locale: locale,
                target_language: languageName,
                namespace,
                chunk: chunkIndex + 1,
                labels,
              },
              null,
              2
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI translation failed: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const translatedLabels = extractJsonObject(content);

    return Object.keys(labels).reduce((safeLabels, key) => {
      const translatedValue = translatedLabels?.[key];
      if (
        translatedValue !== null &&
        translatedValue !== undefined &&
        String(translatedValue).trim() !== ""
      ) {
        safeLabels[key] = String(translatedValue);
      }
      return safeLabels;
    }, {});
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `OpenAI UI translation chunk timed out after ${TRANSLATION_FETCH_TIMEOUT_MS} ms.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function translateMissingLabels({
  locale,
  languageName,
  namespace,
  missingLabels,
}) {
  const chunks = chunkLabelEntries(missingLabels);
  if (!chunks.length) {
    return { translatedLabels: {}, failedKeys: [] };
  }

  const outcomes = await mapWithConcurrency(
    chunks,
    TRANSLATION_CONCURRENCY,
    async (chunk, chunkIndex) => {
      try {
        const translated = await translateLabelChunk({
          locale,
          languageName,
          namespace,
          labels: chunk,
          chunkIndex,
        });
        const failedKeys = Object.keys(chunk).filter(
          (key) => !String(translated?.[key] || "").trim()
        );
        return { translated, failedKeys };
      } catch (error) {
        console.warn("UI translation chunk deferred", {
          locale,
          namespace,
          chunkIndex: chunkIndex + 1,
          keyCount: Object.keys(chunk).length,
          message: error?.message || String(error),
        });
        return { translated: {}, failedKeys: Object.keys(chunk) };
      }
    }
  );

  return {
    translatedLabels: Object.assign(
      {},
      ...outcomes.map((outcome) => outcome.translated || {})
    ),
    failedKeys: outcomes.flatMap((outcome) => outcome.failedKeys || []),
  };
}

async function getOrCreateNamespaceLabels({ supabaseAdmin, locale, namespace }) {
  const defaultLabels = getDefaultNamespaceLabels(namespace);

  if (Object.keys(defaultLabels).length === 0) {
    return {};
  }

  if (locale === DEFAULT_UI_LOCALE) {
    return defaultLabels;
  }

  const { data: existingPack, error: readError } = await supabaseAdmin
    .from("ui_translation_packs")
    .select("id, labels, status")
    .eq("locale", locale)
    .eq("namespace", namespace)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const existingLabels = existingPack?.labels || {};
  const refreshRequested = existingPack?.status === "refresh_requested";
  const missingLabels = refreshRequested
    ? { ...defaultLabels }
    : getLabelsNeedingTranslation(
        defaultLabels,
        existingLabels,
        locale
      );

  if (Object.keys(missingLabels).length === 0) {
    return existingLabels;
  }

  const languageName = getUiLanguageName(locale);

  if (existingPack?.id) {
    await supabaseAdmin
      .from("ui_translation_packs")
      .update({
        status: "updating",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPack.id);
  } else {
    await supabaseAdmin.from("ui_translation_packs").upsert(
      {
        locale,
        language: languageName,
        namespace,
        labels: existingLabels,
        status: "updating",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "locale,namespace",
      }
    );
  }

  const { translatedLabels: translatedMissingLabels, failedKeys } =
    await translateMissingLabels({
      locale,
      languageName,
      namespace,
      missingLabels,
    });

  const mergedLabels = {
    ...existingLabels,
    ...translatedMissingLabels,
  };
  const translationComplete = failedKeys.length === 0;

  const { error: upsertError } = await supabaseAdmin
    .from("ui_translation_packs")
    .upsert(
      {
        locale,
        language: languageName,
        namespace,
        labels: mergedLabels,
        status: translationComplete ? "ready" : "updating",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "locale,namespace",
      }
    );

  if (upsertError) {
    throw upsertError;
  }

  return mergedLabels;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = normalizeUiLocale(searchParams.get("locale"));
    const namespaces = parseNamespaces(searchParams.get("namespaces"));

    const supabaseAdmin = createSupabaseAdminClient();

    const labelsByNamespace = await mapWithConcurrency(
      namespaces,
      2,
      async (namespace) =>
        getOrCreateNamespaceLabels({
          supabaseAdmin,
          locale,
          namespace,
        })
    );

    const labels = Object.assign({}, ...labelsByNamespace);

    return Response.json({
      locale,
      namespaces,
      labels,
    });
  } catch (error) {
    console.error("UI translations failed:", error);

    return Response.json(
      {
        error: "Could not load UI translations.",
      },
      {
        status: 500,
      }
    );
  }
}
