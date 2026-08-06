# Spreelo v143.36 — global calendar image library repair

This update repairs the reusable calendar-image metadata without renaming or deleting existing Supabase Storage objects.

## Deployment order

1. In Supabase SQL Editor, run `supabase/v143_36_calendar_visual_metadata_repair.sql` once.
2. Deploy this application package to Vercel.
3. Allow the existing `generate-calendar-visuals` cron to run normally.

## What changes

- Existing images inherit canonical English `theme_key` and `theme_tags` from the campaign that created them.
- Old local-language filenames and public URLs remain unchanged.
- Files present in `calendar-visual-assets/themes` but missing from `calendar_visual_assets` are registered safely by the worker.
- Only unresolved legacy images are classified visually, at most twice per cron run and at most three attempts per image. Successful images are never sent for classification again.
- A theme keeps at most three generated variants by default before Spreelo reuses the least-used matching image. Set `CALENDAR_THEME_ASSET_TARGET` to 1–8 to override this.
- The atomic global limit of 150 database assets remains in force.
- No image or database row is deleted automatically.

## Verification queries

```sql
select * from public.calendar_visual_theme_inventory order by asset_count desc, theme_key;

select *
from public.calendar_visual_library_audit
where audit_status <> 'ready'
order by audit_status, theme_key;
```

Rows marked `needs_classification` are safe but generic and may be classified manually later. Rows marked `unlinked_asset` were not connected to a durable campaign request; the worker derives a conservative canonical theme from their existing filename.
