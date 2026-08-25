const DEFAULT_APP_URL = "https://app.spreelo.com";

export const VIDEO_MUSIC_BUCKET = "video-music-library";
export const VIDEO_MUSIC_CATALOG_PATH = "catalog/library.json";
export const VIDEO_MUSIC_CATALOG_VERSION = 1;

// Bundled seed track. The managed Supabase catalog is initialized from this
// object the first time an administrator opens the music library. Keeping a
// bundled fallback means video generation remains safe even if Supabase Storage
// is temporarily unavailable.
export const VIDEO_MUSIC_LIBRARY = Object.freeze([
  Object.freeze({
    id: "wait-for-the-drop-v1",
    name: "Wait for the Drop",
    source_kind: "bundled",
    public_path: "/audio-library/wait-for-the-drop.wav",
    public_url: null,
    storage_path: null,
    duration_seconds: 7.2,
    active: true,
    priority: 10,
    volume: 0.5,
    categories: ["premium", "modern", "dynamic"],
    moods: ["energetic", "modern", "confident", "premium", "dynamic"],
    industries: [
      "beauty",
      "fashion",
      "fragrance",
      "lifestyle",
      "retail",
      "sport",
      "tech",
      "ecommerce",
    ],
    formats: ["animated_video", "ai_product_video", "reel", "short_form"],
    keywords: [
      "product",
      "launch",
      "premium",
      "modern",
      "energy",
      "dynamic",
      "fashion",
      "beauty",
      "fragrance",
      "sport",
      "tech",
      "reel",
      "video",
    ],
    energy: "medium",
    notes: "First Spreelo music-library track. End-align the real musical ending with the finished video.",
    created_at: "2026-08-25T00:00:00.000Z",
    updated_at: "2026-08-25T00:00:00.000Z",
  }),
]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTag(value) {
  return normalizeText(value).replace(/\s+/g, "_");
}

function normalizeTagList(value, limit = 40) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(items.map(normalizeTag).filter(Boolean))].slice(0, limit);
}

function normalizeChoice(value, allowed, fallback) {
  const normalized = normalizeTag(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeVideoMusicTrack(raw = {}) {
  const id = String(raw?.id || "").trim();
  if (!id) return null;

  const durationSeconds = clamp(
    raw?.duration_seconds ?? raw?.durationSeconds,
    0,
    60 * 60,
    0
  );
  const publicPath = String(raw?.public_path || raw?.publicPath || "").trim() || null;
  const publicUrl = String(raw?.public_url || raw?.publicUrl || "").trim() || null;
  const storagePath = String(raw?.storage_path || raw?.storagePath || "").trim() || null;

  return {
    id,
    name: String(raw?.name || "Untitled track").replace(/\s+/g, " ").trim().slice(0, 140),
    source_kind: raw?.source_kind === "uploaded" ? "uploaded" : "bundled",
    public_path: publicPath,
    public_url: publicUrl,
    storage_path: storagePath,
    duration_seconds: durationSeconds,
    active: raw?.active !== false,
    priority: Math.round(clamp(raw?.priority, -100, 100, 0)),
    volume: clamp(raw?.volume, 0, 1, 0.5),
    categories: normalizeTagList(raw?.categories),
    moods: normalizeTagList(raw?.moods),
    industries: normalizeTagList(raw?.industries),
    formats: normalizeTagList(raw?.formats),
    keywords: normalizeTagList(raw?.keywords, 80),
    energy: normalizeChoice(raw?.energy, ["low", "medium", "high"], "medium"),
    notes: String(raw?.notes || "").replace(/\s+/g, " ").trim().slice(0, 1200),
    created_at: String(raw?.created_at || raw?.createdAt || new Date().toISOString()),
    updated_at: String(raw?.updated_at || raw?.updatedAt || new Date().toISOString()),
  };
}

export function buildDefaultVideoMusicCatalog() {
  return {
    version: VIDEO_MUSIC_CATALOG_VERSION,
    updated_at: new Date().toISOString(),
    tracks: VIDEO_MUSIC_LIBRARY.map((track) => ({ ...track })),
  };
}

export function normalizeVideoMusicCatalog(raw) {
  const hasExplicitTrackList = Array.isArray(raw?.tracks);
  const sourceTracks = hasExplicitTrackList ? raw.tracks : VIDEO_MUSIC_LIBRARY;
  const tracks = sourceTracks.map(normalizeVideoMusicTrack).filter(Boolean);
  return {
    version: VIDEO_MUSIC_CATALOG_VERSION,
    updated_at: String(raw?.updated_at || new Date().toISOString()),
    tracks,
  };
}

function buildContextText(context = {}) {
  const values = [];
  const visit = (value) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(visit);
      return;
    }
    values.push(String(value));
  };
  visit(context);
  return normalizeText(values.join(" "));
}

function scoreTerms(contextText, terms, weight) {
  let score = 0;
  const matches = [];
  const haystack = ` ${contextText} `;
  for (const rawTerm of terms || []) {
    const term = normalizeText(rawTerm);
    if (!term || !haystack.includes(` ${term} `)) continue;
    score += weight;
    matches.push(rawTerm);
  }
  return { score, matches };
}

export function getVideoMusicPublicUrl(trackOrPath, appUrl = null) {
  const configuredBase = String(
    appUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || DEFAULT_APP_URL
  )
    .trim()
    .replace(/\/$/, "");

  if (trackOrPath && typeof trackOrPath === "object") {
    const absoluteUrl = String(trackOrPath.public_url || trackOrPath.publicUrl || "").trim();
    if (/^https?:\/\//i.test(absoluteUrl)) return absoluteUrl;
    const relative = absoluteUrl || trackOrPath.public_path || trackOrPath.publicPath || "";
    if (!relative) return null;
    return `${configuredBase || DEFAULT_APP_URL}/${String(relative).replace(/^\/+/, "")}`;
  }

  const raw = String(trackOrPath || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${configuredBase || DEFAULT_APP_URL}/${raw.replace(/^\/+/, "")}`;
}

export async function loadManagedVideoMusicCatalog({ supabase } = {}) {
  if (!supabase?.storage) return buildDefaultVideoMusicCatalog();

  try {
    const { data, error } = await supabase.storage
      .from(VIDEO_MUSIC_BUCKET)
      .download(VIDEO_MUSIC_CATALOG_PATH);

    if (error || !data) return buildDefaultVideoMusicCatalog();
    const text = await data.text();
    const parsed = JSON.parse(text);
    return normalizeVideoMusicCatalog(parsed);
  } catch {
    return buildDefaultVideoMusicCatalog();
  }
}

export function selectBestVideoMusicFromTracks({
  tracks,
  context = {},
  targetDurationSeconds,
  appUrl = null,
} = {}) {
  const targetDuration = Math.max(0, Number(targetDurationSeconds) || 0);
  if (!targetDuration) return null;

  const contextText = buildContextText(context);
  const eligible = (Array.isArray(tracks) ? tracks : [])
    .map(normalizeVideoMusicTrack)
    .filter((track) => {
      if (!track?.active) return false;
      if (!getVideoMusicPublicUrl(track, appUrl)) return false;
      return Number(track.duration_seconds || 0) >= targetDuration;
    });

  if (!eligible.length) return null;

  const ranked = eligible
    .map((track) => {
      // Priority is an editorial nudge, while matching metadata remains the main
      // driver once several tracks exist.
      let score = Number(track.priority) || 0;
      const reasons = [];
      for (const [terms, weight, label] of [
        [track.categories, 10, "category"],
        [track.moods, 8, "mood"],
        [track.industries, 7, "industry"],
        [track.formats, 6, "format"],
        [track.keywords, 4, "keyword"],
      ]) {
        const result = scoreTerms(contextText, terms, weight);
        score += result.score;
        if (result.matches.length) reasons.push(`${label}:${result.matches.join(",")}`);
      }

      const normalizedContext = ` ${contextText} `;
      if (track.energy && normalizedContext.includes(` ${normalizeText(track.energy)} `)) {
        score += 5;
        reasons.push(`energy:${track.energy}`);
      }

      return { track, score, reasons };
    })
    .sort((a, b) =>
      b.score - a.score ||
      b.track.priority - a.track.priority ||
      String(a.track.id).localeCompare(String(b.track.id))
    );

  const winner = ranked[0];
  const durationSeconds = Number(winner.track.duration_seconds);
  const trimStartSeconds = Math.max(0, durationSeconds - targetDuration);

  return {
    id: winner.track.id,
    name: winner.track.name,
    url: getVideoMusicPublicUrl(winner.track, appUrl),
    publicPath: winner.track.public_path || null,
    storagePath: winner.track.storage_path || null,
    durationSeconds,
    targetDurationSeconds: targetDuration,
    trimStartSeconds: Number(trimStartSeconds.toFixed(3)),
    volume: Math.max(0, Math.min(1, Number(winner.track.volume) || 0.5)),
    score: winner.score,
    reasons: winner.reasons,
    sourceKind: winner.track.source_kind,
  };
}

export async function selectBestVideoMusic({
  supabase = null,
  context = {},
  targetDurationSeconds,
  appUrl = null,
} = {}) {
  const catalog = await loadManagedVideoMusicCatalog({ supabase });
  return selectBestVideoMusicFromTracks({
    tracks: catalog.tracks,
    context,
    targetDurationSeconds,
    appUrl,
  });
}
