# Spreelo v144.59 — exact Planinställningar reference

This patch corrects the mobile/tablet Planinställningar layout to follow the supplied `4810...` reference exactly in structure rather than only using it as inspiration.

- One continuous white settings card with six compact horizontal rows.
- Icon + title + helper text on the left; current value + chevron on the right.
- No large input boxes inside the rows.
- Exact row order: Goal, post count, start date, post language, Platform, Publishing.
- Platform uses the paper-plane icon; Publishing uses the clock icon.
- Platform expands inline inside the same card and shows connected channel icons as compact square selectors with orange selected state.
- Start date remains a real date picker and keeps the existing no-past-date rule.
- Desktop behaviour is intentionally unchanged; the exact reference treatment applies through phone/tablet widths (<=900 CSS px).

No database/schema changes are required. No SQL file is added by v144.59.
