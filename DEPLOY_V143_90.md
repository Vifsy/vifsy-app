# Deploy v143.90

Ingen ny SQL-migration krävs.

Den nya tidszonsfunktionen använder befintliga `automation_rules.timezone`, `next_run_at`, `publish_time` och Supabase Auth `user_metadata`. Servermiljön behöver därför samma Supabase-variabler som övriga autentiserade API-rutter.

