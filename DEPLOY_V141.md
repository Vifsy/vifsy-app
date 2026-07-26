# Spreelo v141 – Domain-safe produktjobb och återupptagning efter 429

## Före deploy

1. Öppna Supabase SQL Editor.
2. Kör hela `supabase/v141_domain_cooldown_resumable_product_jobs.sql`.
3. Deploya därefter koden till Vercel.

## Vad uppdateringen gör

- `boozt.com` och `www.boozt.com` räknas som samma domän.
- Bara ett produktjobb åt gången får arbeta mot samma domän.
- Alla produktkandidater som redan lagts i kandidatkö behålls.
- Ett webbplats-429 blir `retry_pending`, inte `failed_terminal`.
- Inga krediter återbetalas eller debiteras på nytt under cooldown.
- Samma occurrence återupptas efter `retry_not_before` utan att öka `automatic_run_count`.
- Första 429 ger minst två minuters väntan; upprepade 429 ger längre backoff.

## Första test

Aktivera endast ett vanligt Boozt-produktinlägg. Starta inte en karusell samtidigt. Kontrollera därefter:

- `website_domain_fetch_profiles`
- `website_product_candidate_queue`
- `automation_occurrences`
- `automation_rules`
- `automation_run_logs`
