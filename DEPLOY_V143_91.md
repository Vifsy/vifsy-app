# Deploy v143.91

Ingen ny SQL-migration krävs.

Nya gränssnittstexter läggs automatiskt till i `ui_translation_packs` via det befintliga `/api/ui-translations`-flödet när en användare öppnar sidan på ett annat språk än engelska.

Publiceringstidszonen fortsätter använda befintliga `automation_rules.timezone`, `next_run_at`, `publish_time` och Supabase Auth `user_metadata`.

