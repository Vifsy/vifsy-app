# v143.44 — Pinterest OAuth completion fix

- Adds `user_accounts:read`, required by the Pinterest user-account lookup performed immediately after OAuth.
- Adds stage-specific, non-secret Pinterest OAuth error diagnostics for token exchange, account lookup and connection persistence.
- Adds built-in Swedish Pinterest labels so the new channel never renders blank while remote translation data catches up.
- Normalizes social action button widths on desktop/tablet; mobile remains full-width.
- Keeps the existing board + pin permissions and board-selection flow.
