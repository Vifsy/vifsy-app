# Spreelo v143.99 — Shotstack sandbox render timeout

Built directly on v143.98.

## Change
- Shotstack render polling is increased from 30 to 100 attempts.
- Poll interval remains 3 seconds.
- Effective Shotstack wait window is now about 5 minutes instead of about 90 seconds (plus request time).
- No change to Shotstack environment, API key handling, product selection, video composition, or YouTube publishing.
- No SQL or new environment variables are required.

The automation worker routes already allow up to 600 seconds, so this larger Shotstack wait window fits within the current worker runtime budget for the tested flow.
