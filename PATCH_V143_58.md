# v143.58 — exact product recovery + fail-closed five-product carousel

This patch fixes a runtime regression found in the Zalando school-start test.

- Exact product asset repair no longer references `useVerifiedEditorialPool` from another function scope. The repair agent always uses retailer-domain web search as intended.
- Product-image identity verification can no longer be skipped just because the first carousel product lacks an image before recovery.
- Product carousels now require the full five semantically verified product/image identities. Four verified products is not considered publishable.
- If exact recovery and reserves cannot produce all five, generation fails closed instead of creating an incomplete carousel or risking a wrong product.
- The final carousel slide saver also requires five verified products, providing a second safety barrier.
- Existing product-copy identity validation remains unchanged and continues to fail closed on concrete wrong product mentions.

No SQL migration is required.
