# Spreelo v144.37

## Turbopack parser fix

v144.36 corrected the first pair of double-escaped regular-expression literals in the restored product-discovery helper, but two item-URL heuristics in the same helper still used string-style escaping inside JavaScript regex literals.

Changed:

- `/\\/[^/?#]+-p\\d{3,}/i` -> `/\/[^/?#]+-p\d{3,}/i`
- `/\\/[^/?#]+\\d{5,}/i` -> `/\/[^/?#]+\d{5,}/i`

No product-price extraction has been restored. The v144.35 product-discovery and purchasability fixes remain in place.

Validation for this package includes the v144.30-v144.37 targeted regression suite plus a TypeScript-parser syntax pass across all JS/JSX/MJS/CJS source files. The latter catches the exact parser class that Node `--check` missed in v144.36.
