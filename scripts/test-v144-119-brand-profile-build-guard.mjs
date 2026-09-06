import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
const expected = '@import "./styles/104-v144-118-brand-profile-reference-rebuild.css";';

if (!css.includes(expected)) throw new Error("Quoted Brand Profile CSS import is missing.");
if (css.includes("@import ./styles/104-v144-118-brand-profile-reference-rebuild.css;")) {
  throw new Error("Invalid unquoted Brand Profile CSS import still exists.");
}
if (!fs.existsSync(path.join(process.cwd(), "app", "styles", "104-v144-118-brand-profile-reference-rebuild.css"))) {
  throw new Error("Brand Profile CSS target file is missing.");
}
console.log("v144.119 build guard passed.");
