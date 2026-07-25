# Spreelo v140 – säker driftsättning

Den här versionen inför ett enda automatiskt genereringsförsök per planerad förekomst, terminal felstatus, kreditåterföring, kundmeddelanden, 403-diagnostik och ny kundadministration.

## Viktigt före start

- Låt samtliga Vercel-cronjobb vara pausade.
- Ta en aktuell säkerhetskopia eller snapshot av Supabase-databasen.
- Den befintliga interna produktsökningen är inte ombyggd. Store Map, cache, `best_match`, `domain_site_search`, `backup_broad`, verifiering och reserver får fortsatt användas inom den enda worker-körningen.

## 1. Kör databasmigrationen först

Öppna Supabase SQL Editor och kör:

`supabase/v140_safe_attempts_customer_operations.sql`

Migrationen:

- skapar en unik automatisk förekomst per regel och planerad tid;
- inför terminala fel, återföringar och kundnotiser;
- lägger till webbplatsens säkerhetsstatus på företag;
- pausar äldre förfallna regler när senaste körningen misslyckats, en running-körning varit fast i mer än tre timmar, eller regeln saknar körlogg men fortfarande har uttrycklig retry/felstatus;
- lämnar framtida orörda regler och regler vars senaste körning lyckats oförändrade.

Granska efter migrationen vilka gamla regler som pausats innan cron återaktiveras.

## 2. Nödvändiga miljövariabler

Befintliga Supabase- och OpenAI-variabler måste finnas som tidigare.

För kundmejl krävs fungerande Resend-konfiguration. Saknas den skapas fortfarande fel- och återbetalningshistorik, men mejlet markeras som `suppressed` eller `failed` i admin.

## 3. Lägg upp som Vercel Preview

Publicera först en Preview Deployment. Aktivera inte produktionens cronjobb ännu.

Kontrollera följande i preview:

1. En vanlig åtkomlig webbplats analyseras precis som tidigare.
2. En webbplats som redan svarar med 403 stoppas innan OpenAI-analys och får ett begripligt säkerhetsmeddelande.
3. Ett generiskt 403-svar utan säker leverantörssignatur får inget påhittat leverantörsnamn.
4. En tydlig Boozt-liknande produktsida godkänns trots rekommenderade produktkort längre ned.
5. Kandidater hålls inom marknadsdelen i den URL kunden angett, exempelvis `/se/`.
6. Ett misslyckat skapande får status `failed_terminal`.
7. Samma regel och `scheduled_for` kan inte genereras automatiskt en andra gång.
8. Reserverad kredit återförs exakt en gång när inget användbart inlägg skapades.
9. Misslyckandet syns som **Kunde inte skapas** i kundens innehållsplan.
10. Kundmejl, kreditbok och kundkort visas korrekt i admin.
11. Ett skapat inlägg vars publicering misslyckas behåller krediten och kan publiceras igen utan ny generering.

## 4. Kontrollera admin

Öppna:

- `/admin/customers`
- `/admin/customers/[kund-id]`
- `/admin/credits`

Kontrollera särskilt:

- skapade och misslyckade inlägg per månad;
- återförda krediter;
- felorsaker;
- skickade eller undertryckta kundmejl;
- blockerade webbplatser;
- oväntade automatiska omkörningar;
- att exakta AI-kostnader inte visas som kända när de inte registrerats.

## 5. Produktion och återstart

När preview-testerna är godkända:

1. Publicera v140 till produktion.
2. Kontrollera att samma migration är genomförd i produktionsdatabasen.
3. Kontrollera de gamla regler som migrationen pausade.
4. Aktivera cronjobben gradvis.
5. Bevaka Vercel-loggar och adminöversikten under de första körningarna.
6. Pausa cron igen om `automatic_run_count > 1`, oväntade kredittransaktioner eller nya upprepade generationer syns.

## Begränsningar i denna version

- Versionen identifierar och sparar säkerhetsleverantör efter ett redan konstaterat 403-svar. Den lägger inte till någon ny spärr före den befintliga hämtningen.
- Fast utgående Spreelo-IP och färdiga allowlist-instruktioner ingår inte ännu. Det kräver att analysanslutningen först får en verklig statisk egress-IP.
- Fullständig historisk AI-kostnad kan inte återskapas om tidigare körningar inte lagrat modell-, token- och kostnadsdata. Korrekt data visas bara där den faktiskt finns.
