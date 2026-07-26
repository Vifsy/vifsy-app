# Spreelo v141.1 – korrigeringar

Den här zip-versionen bygger vidare på v141 och innehåller följande korrigeringar:

- Ett aktivt domänlås blockerar alla andra produktjobb mot domänen, även återinträde från samma regel.
- En occurrence som återupptas efter 429 får sina tillfälliga felfält rensade.
- `No verified matching website product...` klassas som `no_suitable_product`.
- 429-försök har ett konfigurerbart tak via `WEBSITE_RATE_LIMIT_MAX_RETRIES` (standard 5, tillåtet 1–12).
- När retry-taket nås avslutas occurrence terminalt genom det befintliga idempotenta failure-flödet, vilket återbetalar reserverade krediter och skickar normal felnotifiering.
- v141-testet kontrollerar de nya invarianterna.

## Deploy

1. Kör `supabase/v141_domain_cooldown_resumable_product_jobs.sql`.
2. Deploya applikationskoden.
3. Kontrollera att Boozt-profilens `website_product_source_url` använder avsedd marknad, exempelvis `https://www.boozt.com/se/sv/`.
