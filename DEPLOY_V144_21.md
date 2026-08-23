# Deploy v144.21

1. Deploy the full v144.21 project normally to Vercel.
2. No Supabase migration is needed.
3. No environment variable changes are needed.
4. After deploy, verify:
   - Home: three one-time planned posts show `3` in `Planerade inlägg` and expand to three rows.
   - Removing one future planned rule removes only that item and updates the count.
   - Active calendar campaigns can be expanded and managed.
   - Settings > Språk: timezone dropdown contains the full IANA list and remains usable after saving.
   - Create a test rule in a non-Swedish timezone and confirm the local time is preserved after save.
   - AI Content Studio: open a planned post's date editor and inspect the redesigned calendar.
   - AI Content Studio bottom cards use normal readable copy sizes.
