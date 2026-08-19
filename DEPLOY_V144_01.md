# Spreelo v144.01 — Admin Review Workbench

## Viktigt före deploy

Kör först SQL-migrationen i Supabase SQL Editor:

`supabase/v144_01_admin_review_workbench.sql`

Migrationen:
- återställer trelägeslogiken för `brand_profiles.admin_review_required`:
  - `TRUE` = lyckade inlägg går via Spreelo-admin
  - `FALSE` = lyckade inlägg går direkt till kunden
  - `NULL` = ärver den globala adminpolicyn
- ändrar inte befintliga kundval i bulk
- skapar `admin_post_versions` för versionshistorik och återställning

Misslyckade, avbrutna eller ofullständiga generationer går alltid till Spreelo-admin oavsett kundens granskningsinställning.

## Deploy

Efter SQL-migrationen deployas hela v144.01-projektet på vanligt sätt via GitHub/Vercel.

Ingen ny miljövariabel krävs för v144.01.

## Kontroll efter deploy

1. Öppna Admin → Kunder → välj kund → Varumärken.
2. Kontrollera att varje varumärke har en switch för admin-granskning.
3. Med granskning aktiverad ska ett lyckat inlägg hamna i Admin → Inläggsgranskning.
4. Stäng av granskning för ett testvarumärke. Ett lyckat inlägg ska då gå direkt vidare till kunden.
5. Ett misslyckat/avbrutet inlägg för samma testvarumärke ska fortfarande hamna i adminarbetskön.
6. Kontrollera att standardkön visar både inlägg som väntar på granskning och inlägg som behöver repareras.
7. Öppna ett produktinlägg och kontrollera admin-only länken till produktsidan.
8. Byt produkt via produkt-URL och regenerera.
9. Testa manuell produktinmatning + bilduppladdning för en blockerad/otillgänglig produktsida.
10. Öppna ett icke-produktdrivet inlägg, byt käll-URL och regenerera. Testa även endast text respektive endast bild när alternativet finns.
11. Kontrollera versionshistoriken och återställ en tidigare version.
12. Godkänn slutversionen och kontrollera att endast den godkända versionen når kunden.

## Huvudändringar

- Per-varumärke-granskning respekteras åter av automationsmotorn.
- Global granskning fungerar som standard för varumärken som ärver policyn.
- Fel och avbrott stannar alltid i admin.
- Gemensam arbetskö för granskning och reparation.
- Ny professionell Admin Review Workbench-design.
- Sökning och filter i admin.
- Originalkälla och företagswebbplats direkt tillgängliga.
- Admin-only produktlänk bredvid produkter.
- Förenklad manuell produktinmatning med avancerade fält under separat sektion.
- Generell regenerering för icke-produktdrivna format med samma delade generatorfunktioner som automationen.
- Befintliga produkt-, karusell-, annons- och Reel-reparationer fortsätter använda de delade produkt-/renderingsfunktionerna från automationsmotorn.
- Möjlighet att regenerera hela inlägget och, för generiska format, endast text eller media.
- Versionshistorik och återställning för adminregenereringar.

## Teststatus i källpaketet

Följande regressionskontroller ska passera:

`node scripts/test-v144-01-admin-review-workbench.mjs`

`node scripts/test-v144-00-delivery-first-resilience.mjs`

En full Next.js-build kräver installerade projektberoenden (`node_modules`) och ingår inte i det dependency-fria källpaketet.
