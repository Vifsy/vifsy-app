import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const page = read('app/automation/page.jsx');
const css = read('app/styles/38-current-experience-v143.css');

check('Campaign preview exposes per-post unlock control', page.includes('campaign-v14346-unlock-schedule') && page.includes('updateSlot(slot.id, "dateLocked", false)'));
check('Campaign preview uses date picker after unlock', page.includes('pickerId={`campaign-slot-date-${slot.id}`}') && page.includes('scheduleUnlocked ? ('));
check('Campaign preview uses time picker after unlock', page.includes('pickerId={`campaign-slot-time-${slot.id}`}') && page.includes('campaign-v14346-time-picker'));
check('Campaign slots default to locked unless explicitly unlocked', page.includes('const scheduleUnlocked = slot.dateLocked === false'));
check('Full planner lets normal customers unlock campaign dates', page.includes('slot.isCampaignSlot && slot.dateLocked !== false') && page.includes('className="unlock-campaign-date-button"'));
check('Full planner time becomes editable with unlocked schedule', page.includes('slot.isCampaignSlot && slot.dateLocked !== false ? (') && page.includes('pickerId={`slot-time-${slot.id}`}'));
check('Unlocked date changes still flow through updateSlot', page.includes('onChange={(value) => updateSlot(slot.id, "startDate", value)}'));
check('Unlocked time changes still flow through updateSlot', page.includes('onChange={(value) => updateSlot(slot.id, "publishTime", value)}'));
check('Unlock link is visually discrete', css.includes('.campaign-v14346-unlock-schedule') && css.includes('background: transparent !important') && css.includes('font-size: 10px !important'));
check('Unlocked pickers have compact campaign styling', css.includes('.campaign-v14335-slot-date.is-unlocked .custom-picker-button') && css.includes('min-height: 42px !important'));
check('Tablet unlocked schedule gets dedicated grid rows', css.includes('grid-template-areas:') && css.includes('"art copy time menu"') && css.includes('"art copy format menu"'));
check('Mobile unlocked schedule gets dedicated date/time rows', css.includes('"art date"') && css.includes('"art time"') && css.includes('overflow: visible !important'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} v143.46 campaign schedule unlock checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.46 campaign schedule unlock checks passed.`);
