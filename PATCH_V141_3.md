# Spreelo v141.3 – resume mot färdigt produktinlägg

Den här versionen innehåller v141.2 och gör cooldown-retryn leveransinriktad.

- En återupptagen kampanj laddar först den persistenta `website_product_candidate_queue`.
- Redan sparade kandidater verifieras innan store search, ny web research eller andra dyra upptäcktssteg startas.
- Tekniskt verifierade delresultat sparas omedelbart i produktkatalogen, även om en senare kandidat ger 429. Nästa retry bygger därför vidare på tidigare verifierade produkter.
- Om kandidatkö och katalog tillsammans ger fem färska kampanjsäkra produkter fortsätter skapandet direkt till det färdiga karusellinlägget.
- Om Boozt ger en ny 429 innan fem produkter är klara skjuts samma occurrence upp igen utan att de verifierade delresultaten förloras.
- Alla återstående carousel-fallbacks kastar 429 vidare till det centrala cooldown-flödet i stället för att maskera felet.

Detta garanterar inte åtkomst när en extern webbplats fortsätter blockera alla förfrågningar, men varje lyckad produktverifiering ackumuleras över retries så att inlägget kan färdigställas så snart fem produkter är tillgängliga.

## Deploy

1. Kör den uppdaterade `supabase/v141_domain_cooldown_resumable_product_jobs.sql`.
2. Deploya därefter applikationskoden.
3. Låt samma occurrence fortsätta automatiskt; skapa inte en ny parallell regel för samma post.
