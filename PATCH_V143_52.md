# v143.52 — Pinterest smart destination links

Pinterest Pins now get a real click-through destination automatically instead of relying on a URL being present in the generated caption.

Destination priority:

1. Product carousel: the carousel outro/category/collection destination stored on the final slide.
2. Single-product and other visual posts: the verified/source `posts.website_url` already saved with the post.
3. Explicit URL in the post copy, when one exists.
4. Brand product-source URL or brand homepage as a final fallback.

Every valid Pinterest destination receives non-destructive UTM attribution when missing:

- `utm_source=pinterest`
- `utm_medium=organic_social`
- `utm_campaign=spreelo`
- `utm_content=<post id>`

Existing UTM parameters supplied by the customer are preserved. Only HTTP(S) destinations are accepted and Pinterest's 2048-character link limit is respected.

The Pinterest API payload uses the official `link` field, so clicking the Pin image can send the visitor to the customer's product, collection or website page.

No database migration is required.
