import fs from 'node:fs';

const file = 'app/automation/page.jsx';
const source = fs.readFileSync(file, 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(/\buseCallback\s*\(/.test(source), 'Expected /automation to use useCallback.');
const reactImport = source.match(/import\s*\{([^}]+)\}\s*from\s*["']react["'];?/s);
expect(reactImport, 'Expected a named React import in /automation.');
expect(/\buseCallback\b/.test(reactImport[1]), 'useCallback must be imported from React when used by /automation.');

console.log('v143.75 /automation useCallback import regression check passed');
