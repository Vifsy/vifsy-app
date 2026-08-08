# v143.51 — Pinterest Sandbox bootstrap + write verification

## Why
Pinterest Trial access uses API Sandbox for Pin/Board writes. Sandbox entities are isolated from production, so a production board is intentionally not returned after reconnecting with a Sandbox token.

## Changes
- Adds environment-aware Pinterest Board creation through `POST /v5/boards`.
- Adds environment-aware Pinterest Pin creation helper through `POST /v5/pins`.
- When no Sandbox boards exist, the Pinterest board picker now offers **Create test board and verify** instead of sending the user to normal Pinterest.
- The action creates/reuses an owned `Spreelo Test` Sandbox board, creates a real image test Pin, and only then marks the board connection as connected.
- Production is guarded: the Sandbox bootstrap action returns an error unless `PINTEREST_API_ENV=sandbox`.
- Adds a clear success notice after the board and test Pin have both been created.
- Treats Pinterest's `The authorization grant is invalid` response as an authentication failure so reconnect handling is correct.
- No SQL migration required.

## Test flow
1. Keep `PINTEREST_API_ENV=sandbox` in Vercel.
2. Deploy v143.51.
3. Reconnect Pinterest if the current connection was established before Sandbox was enabled.
4. If the board picker has no boards, click **Skapa testanslagstavla och verifiera**.
5. Spreelo creates `Spreelo Test` and a Sandbox test Pin through Pinterest API.
6. Open the Pinterest profile. Pinterest documents that Sandbox Boards/Pins created by the API are visible to their creator.
7. Then create a normal Spreelo Pinterest post and approve it to test the full scheduled publishing worker.
