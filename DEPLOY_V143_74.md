# Deploy Spreelo v143.74

## 1. Run SQL first
Run this file in Supabase SQL Editor:

`supabase/v143_74_content_economics.sql`

This migration is required for the new Admin Content & Credits page.

It adds economics fields to `content_format_library`, creates the `content_credit_audit` table and creates the `content_economics_settings` singleton settings table.

## 2. Deploy the full application
Deploy the complete v143.74 project as usual.

## 3. Verify
1. Sign in with the primary Spreelo Admin account.
2. Open Admin → Content & Credits.
3. Confirm all built-in content types are visible.
4. Change one credit value, save it, and verify an audit row appears.
5. Open AI Content Studio and confirm a newly created plan uses the updated credit value.
6. Optionally create a custom catalog type and verify it is marked Catalog only and disabled.

## Notes
- The migration does not rewrite historical `automation_rules.credit_cost` snapshots.
- Existing saved plans therefore keep their original reserved/charged credit amount. New plans use the Admin-configured current/effective credit price.
