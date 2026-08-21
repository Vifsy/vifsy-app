# Spreelo v144.05 patch

- Restores the animated-email play overlay and routes it to a preview-only approval modal.
- Both preview approval and direct email approval now converge on one general approval step.
- General approval releases ordinary selected channels first; TikTok remains a separate required settings/consent step.
- TikTok is processed last and missing TikTok consent is a waiting state, never a failure that blocks other channels.
- TikTok waiting posts stop hot-looping while still waking immediately when the customer submits TikTok settings.
- Durable GPT-5.5 campaign research no longer fails terminally when a dynamic request fingerprint changes for the same occurrence/research round. Existing OpenAI responses are resumed; pre-start jobs refresh their fingerprint.
- Fixes the duplicate serviceRoleKey declaration in the v144.04 working route.
- No SQL migration required.
