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
- Högst två kompletta 429-drabbade körningar tillåts för samma occurrence: första försöket och ett enda automatiskt återförsök. Det hårda taket är två även om en äldre miljövariabel har ett högre värde.
- Ett aktivt domänlås blockerar även en återinträde från samma regel.
- En återupptagen occurrence rensas från tidigare 429-felfält innan den kör vidare.
- Feltexten `No verified matching website product...` klassas som `no_suitable_product`.
- Cooldown-fel från store search, discovery pages och produktverifiering avslutar sökningen omedelbart och går direkt till `retry_pending`.
- Resume behåller regelns kölås så att samma regel inte plockas av flera workers.
- Redan första kampanjkörningen använder verifierad katalog och sparad kandidatkö före ny butikssökning.
- Det enda återförsöket hoppar över den dyra butikssökningen och domän-webbsökningen, verifierar sparade kandidater först och sparar varje verifierat delresultat.
- Första körningen använder därefter Store Map-vägen som lyckades i den verifierade Boozt-körningen, innan butikssökning och webbsökning.
- Smala produkthyllor prioriteras före mycket breda avdelningar och Store Map får fortsätta tillräckligt länge för att samla fem kampanjrelevanta produkter i samma körning.
- Ett återförsök verifierar upp till 24 sparade kandidater i stället för åtta.
- Bildhämtning begär WebP/JPEG/PNG i stället för AVIF/HEIF som den driftsatta bildmotorn inte kunde avkoda.

## Kontrollera Boozt-marknaden

Sätt Brand profile-fältet `website_product_source_url` till den marknad som ska användas, exempelvis `https://www.boozt.com/se/sv/`. En generell rotadress kan annars låta Store Map följa en omdirigering till `/eu/en/`.

## Första test

Aktivera endast ett vanligt Boozt-produktinlägg. Starta inte en karusell samtidigt. Kontrollera därefter:

- `website_domain_fetch_profiles`
- `website_product_candidate_queue`
- `automation_occurrences`
- `automation_rules`
- `automation_run_logs`
