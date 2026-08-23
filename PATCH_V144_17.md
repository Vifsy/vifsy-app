# Spreelo v144.17 – changes

Built from v144.16.

## 1. Products must be currently purchasable
The product researcher is now explicitly instructed to use the current official product page and avoid discontinued, sold-out, out-of-stock or otherwise non-orderable products.

The authoritative GPT-5.5 exact-product repair now returns:
- `availability_status`
- `availability_evidence`
- the originally selected candidate's availability status when a replacement is needed

Confirmed purchase states are:
- in_stock
- available
- preorder
- backorder

For directly readable product pages, Spreelo also treats an actual current main-product purchase action (for example Add to cart / Buy now / Lägg i varukorg) as purchase evidence when structured availability is missing. Explicit discontinued/out-of-stock text wins over that fallback.

Known non-purchasable states are filtered from product pools:
- out_of_stock
- discontinued

Unknown availability is not treated as "out of stock" by local heuristics; it is kept as unknown until an authoritative step can establish it. This avoids a new false-negative hard gate.

## 2. 403 flow remains one paid exact-repair batch
The v144.11 one-batch invariant is preserved.

For a known 403 retailer:
1. inexpensive research nominates product candidates;
2. one GPT-5.5 exact-repair batch opens the official domain;
3. it verifies exact identity, exact official main image and current purchase availability;
4. if a nominated product is explicitly unavailable, the same request may find a different relevant, currently purchasable product on the same retailer domain;
5. the replacement must independently satisfy the same exact same-page title/image/product binding.

This avoids both:
- promoting old discontinued indexed products; and
- adding a second/third paid GPT-5.5 retry loop that could increase cost or create another failure path.

## 3. Old unavailable catalog entries are not selected
Known unavailable products are filtered from:
- carousel-valid product pools;
- catalog selection;
- generic unused-product selection;
- product-intent final selection.

## 4. Kling-generated text removed
The text beta introduced in v144.15/v144.16 has been removed after the real-world spelling test.

Kling is now explicitly instructed:
- no new readable overlay text;
- no captions/slogans/prices/labels/typography;
- preserve only readable text physically present on the verified product reference;
- no fake logos or watermarks.

The more energetic/viral motion direction and the large first-frame product composition from v144.16 remain.

## 5. No return of the v144.15 failure gate
v144.17 does not restore:
- whole-product visibility as a hard gate;
- availability as a post-generation terminal gate;
- `no_suitable_product` from generative reference selection.

Availability is handled upstream while choosing/locking the product, where Spreelo can substitute a valid purchasable product without paying for Kling first.

## Tests
Passed:
- node syntax check for run-automations route
- v144.17 purchasable-product / no-Kling-text checks
- v144.14 home schedule management
- v144.13 campaign identity lock + executable Black Friday scenario
- v144.12 exact generation cost tracking
- v144.11 batched 403 fallback
- v144.10 indexed 403 fallback
- v144.09 Kling duration finalization
- v144.08 social reconnect
- v144.07 Kling one-generation guard/provider adapter
- v143.58 exact-product fail-closed recovery
- v143.64 locked product-page object
- v143.57 product identity integrity

`npm run build` could not be executed in this isolated workspace because `node_modules`/the local `sharp` package is not installed here. This is an environment/dependency absence, not a compile error; `node --check` and the targeted regression tests pass.
