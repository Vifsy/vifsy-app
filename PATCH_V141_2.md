# Spreelo v141.2 – snabb och exklusiv cooldown-resume

Den här versionen innehåller v141.1 samt två korrigeringar som verifierades mot en verklig Boozt-körning den 26 juli 2026.

- En 429 från store search, discovery pages eller produktverifiering kastas omedelbart vidare till det centrala cooldown-flödet. Produkten fortsätter inte genom resterande fallback-försök under en aktiv domäncooldown.
- En återupptagen occurrence behåller ett 15 minuter långt `queue_locked_until`. Samma regel kan därför inte plockas av en andra worker medan retryn redan körs.
- Om samma regel ändå möter sitt eget aktiva domänjobb ändras inte `retry_not_before` eller `product_retry_reason`; den överflödiga körningen loggas som `same_rule_product_job_already_running`.

## Förväntat loggflöde

1. Första 429 registreras.
2. Körningen avslutas snabbt som `skipped` med `failure_code=website_rate_limited`.
3. Regeln får `retry_not_before`.
4. Samma occurrence återupptas en gång efter cooldown.
5. Inga upprepade `Could not fetch discovery page...` ska skrivas under samma cooldown.

## Deploy

1. Kör den uppdaterade `supabase/v141_domain_cooldown_resumable_product_jobs.sql` även om en äldre v141-version redan har körts.
2. Deploya därefter applikationskoden.
