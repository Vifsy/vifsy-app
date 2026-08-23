# Spreelo v144.23 — OpenAI background-job lifecycle and emergency stop

## Why
Production logs from 2026-08-23 showed one Inet carousel occurrence starting several durable GPT-5.5 background responses across campaign research and exact-product repair slots. A deployment does not cancel OpenAI Responses API jobs that were already started with `background: true`.

## Changes
- Added a reusable OpenAI background-response lifecycle helper using `openai.responses.cancel(responseId)`.
- A completed automation occurrence now cancels any still-running durable campaign research responses.
- A terminally failed occurrence does the same.
- A duplicate claim that discovers an already-terminal occurrence also cleans up old responses.
- Before a new durable response is started, Spreelo cancels any other active response owned by the same occurrence. This enforces one live paid background response per occurrence.
- Worker 1 performs a bounded cleanup pass for active campaign-research rows whose occurrence is terminal or whose automation rule has been paused.
- Added an admin endpoint and Admin-dashboard emergency button: `Stoppa pågående jobb`.
- Emergency stop cancels all tracked campaign background responses and tracked brand-analysis background responses, then applies a 15-minute cooldown before automatic retry.
- The emergency endpoint also checks the four response IDs observed in the 2026-08-23 Inet incident in case a database row was lost before cleanup.
- Added `max_tool_calls` ceilings to campaign GPT-5.5 research (16), exact-product repair (12), and blocked-site brand research (18) so one response cannot run an unbounded number of paid web-search tool calls.

## Database / environment
No new SQL migration and no new environment variable are required.

## Verification
Run:

```bash
node scripts/test-v144-23-openai-background-lifecycle.mjs
```

The v144.18–v144.22 regression tests should remain green.
