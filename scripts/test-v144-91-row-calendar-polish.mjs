import fs from 'node:fs';
const css = fs.readFileSync('app/styles/88-v144-91-row-calendar-polish.css','utf8');
const globals = fs.readFileSync('app/globals.css','utf8');
const required = [
  '88-v144-91-row-calendar-polish.css',
  '.plan-v70-row-editor .custom-picker-field.compact',
  'background: transparent !important',
  'grid-template-columns: repeat(7, minmax(0, 1fr)) !important',
  '.plan-v70-row-editor:has(.custom-calendar-popover)',
  'width: min(314px, 100%) !important'
];
for (const token of required) {
  if (!(globals + '\n' + css).includes(token)) throw new Error(`Missing v144.91 requirement: ${token}`);
}
const automation = fs.readFileSync('app/automation/page.jsx','utf8');
if (!automation.includes('className="plan-v70-row-editor"')) throw new Error('Planned-row editor markup missing');
if (!automation.includes('pickerId={`v70-row-date-${slot.id}`}')) throw new Error('Planned-row date picker missing');
console.log('v144.91 planned-post calendar polish checks passed');
