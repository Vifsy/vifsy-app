import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { getValidAnalysisAccessToken } = await import(
  pathToFileURL(path.join(root, "lib/analysisSession.js")).href
);

function createAuthMock({ session, refreshedSession, refreshError = null }) {
  let getSessionCalls = 0;
  let refreshSessionCalls = 0;

  return {
    supabase: {
      auth: {
        async getSession() {
          getSessionCalls += 1;
          return { data: { session }, error: null };
        },
        async refreshSession() {
          refreshSessionCalls += 1;
          return {
            data: { session: refreshedSession || null },
            error: refreshError,
          };
        },
      },
    },
    calls() {
      return { getSessionCalls, refreshSessionCalls };
    },
  };
}

{
  const mock = createAuthMock({
    session: {
      access_token: "current-token",
      expires_at: Math.floor(Date.now() / 1000) + 300,
    },
  });
  const token = await getValidAnalysisAccessToken({
    supabase: mock.supabase,
    fallbackAccessToken: "old-token",
    timeoutMs: 500,
  });
  assert.equal(token, "current-token");
  assert.deepEqual(mock.calls(), {
    getSessionCalls: 1,
    refreshSessionCalls: 0,
  });
}

{
  const mock = createAuthMock({
    session: {
      access_token: "expiring-token",
      expires_at: Math.floor(Date.now() / 1000) + 5,
    },
    refreshedSession: {
      access_token: "refreshed-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  });
  const token = await getValidAnalysisAccessToken({
    supabase: mock.supabase,
    fallbackAccessToken: "expiring-token",
    timeoutMs: 500,
  });
  assert.equal(token, "refreshed-token");
  assert.equal(mock.calls().refreshSessionCalls, 1);
}

{
  const mock = createAuthMock({
    session: {
      access_token: "rejected-token",
      expires_at: Math.floor(Date.now() / 1000) + 300,
    },
    refreshedSession: {
      access_token: "retry-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  });
  const token = await getValidAnalysisAccessToken({
    supabase: mock.supabase,
    fallbackAccessToken: "rejected-token",
    forceRefresh: true,
    timeoutMs: 500,
  });
  assert.equal(token, "retry-token");
  assert.equal(mock.calls().refreshSessionCalls, 1);
}

for (const relativeFile of ["app/brand/page.jsx", "app/onboarding/page.jsx"]) {
  const source = fs.readFileSync(path.join(root, relativeFile), "utf8");
  assert.match(source, /getValidAnalysisAccessToken/);
  assert.match(source, /statusResponse\.status === 401/);
  assert.match(source, /forceRefresh: true/);
  assert.match(source, /statusResponse = await requestStatus\(currentAccessToken\)/);
  assert.doesNotMatch(
    source,
    /Authorization: `Bearer \$\{accessToken\}`/,
    `${relativeFile} must not reuse the originally captured token while polling`
  );
}

console.log("v143.12 brand-analysis session refresh tests passed.");

