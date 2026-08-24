# v144.32 — Visible one-time i18n

- English remains the only canonical UI source locale.
- Missing target-language labels now fall back visibly to English instead of rendering empty strings.
- Successful non-English labels remain persisted in `ui_translation_packs` and are reused across users and visits.
- Incomplete translation packs retry after five minutes instead of six hours.
- OpenAI UI-translation timeout increased from 6.5s to 12s to reduce false transient failures.
- Legacy six-hour deferred metadata is ignored so previously stuck keys can recover immediately after deployment.
- Transport/provider timeouts still do not trigger an immediate second paid repair attempt.
