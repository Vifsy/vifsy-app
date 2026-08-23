# Deploy Spreelo v144.20

1. Deploy the full v144.20 project as usual.
2. No new Supabase SQL migration is required; v144.20 reuses the existing v144.00 transient retry RPC.
3. No new environment variable is required.
4. Optional: `PROTECTED_PRODUCT_STOCK_FRESH_MS` can override the protected-site stock freshness window. Default is 2 hours and code clamps it to 15 minutes–6 hours.
5. After deployment, test one normal accessible store and one protected store (for example Inet) to confirm both paths:
   - normal stores continue through existing Product Engine V2 behavior;
   - protected stores use fresh public/indexed current-assortment discovery and only promote explicitly in-stock products.
