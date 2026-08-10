# v143.71 — customer review separation + Home guidance

- Customer Home review links now open `/review`, never `/admin`.
- Added customer review queue and post history scoped to signed-in user + selected brand.
- Internal Spreelo review remains under `/admin/post-approvals`.
- Admin route tree blocks non-admin accounts before admin UI renders.
- Primary admin defaults to `johan@foldern.com`; change only with `SPREELO_PRIMARY_ADMIN_EMAIL`.
- Direct customer post URLs remain hidden until Spreelo internal review is complete.
- Home modules now have help popovers and contextual create actions.
- Added shared Spreelo action/button styling.
- Tightened vertical rhythm on Home, Admin review queue and history lists.
- English remains source UI copy; Swedish critical fallbacks added and translation cache bumped to v15.
- No new SQL required.
