# v143.60 — Admin carousel regeneration slide contract

- Fixes admin carousel regeneration failing `post_slides_slide_type_check` after all images had already rendered.
- Admin regeneration now stores both product slides and the AI/preserved outro with database `slide_type = content`, matching the normal carousel generator.
- Product/outro semantics remain in `metadata.carousel_slide_role` (`product` / `product_outro`).
- Adds a defensive pre-save slide-type guard and clearer save errors.
- Shows regeneration success/failure inside the open Admin detail modal so the result is immediately visible.
- Keeps a newly created repaired post selected after the list reload.
- No SQL migration required.
