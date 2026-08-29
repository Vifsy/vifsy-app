import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const globals = await readFile(new URL("app/globals.css", root), "utf8");
const css = await readFile(new URL("app/styles/63-v144-63-home-admin-responsive.css", root), "utf8");
const home = await readFile(new URL("components/HomeReferenceOverview.jsx", root), "utf8");
const approvals = await readFile(new URL("app/admin/post-approvals/page.jsx", root), "utf8");

assert.ok(globals.includes('@import "./styles/63-v144-63-home-admin-responsive.css";'));
assert.match(home, /is-empty-status/);
assert.match(home, /recurringCount \|\| "Inga aktiva"/);
assert.match(home, /scheduledCount \|\| "Inget planerat"/);
assert.match(css, /home-reference-plans article > strong[\s\S]*position:absolute !important/);
assert.match(css, /home-reference-plans article > a[\s\S]*bottom:15px !important/);

assert.match(approvals, /const POSTS_PER_PAGE = 15/);
assert.match(approvals, /filteredPosts\.slice\(\(currentPage - 1\) \* POSTS_PER_PAGE/);
assert.match(approvals, /admin-review-pagination/);
assert.match(approvals, /Gå till sida/);
assert.match(approvals, /ref=\{postCopyRef\}/);
assert.match(approvals, /textarea\.scrollHeight/);
assert.match(css, /admin-review-copy-editor textarea[\s\S]*overflow:hidden !important/);
assert.match(css, /admin-insight-name strong[^{]*\{ font-size:13px !important/);
assert.match(css, /@media \(max-width:900px\)[\s\S]*admin-v140-two-column/);
assert.match(css, /@media \(max-width:600px\)[\s\S]*admin-review-pagination/);

console.log("v144.63 Home and Admin responsive checks passed");
