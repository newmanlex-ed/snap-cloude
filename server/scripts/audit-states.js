// Lists every state value that still needs a human to verify it against an
// official source. Exit code 1 if anything is unverified, so CI can gate a
// "public launch" on a clean audit.
import { STATES } from '../src/data/states.js';

let open = 0;
for (const s of STATES) {
  const issues = [];
  if (!s.bbce) issues.push('BBCE income/asset policy unknown (federal limits used)');
  else if (s.bbce.confidence !== 'verified') issues.push(`BBCE ${s.bbce.grossPct}% is ${s.bbce.confidence}`);
  if (!s.sua) issues.push('standard utility allowance unknown (actual bills used)');
  else if (s.sua.confidence !== 'verified') issues.push(`SUA $${s.sua.amount} (FY${s.sua.fy}) is ${s.sua.confidence}; refresh for FY2027`);
  if (s.apply.confidence !== 'verified') issues.push(`apply link ${s.apply.url} not live-checked`);
  if (issues.length) {
    open += issues.length;
    console.log(`${s.code} ${s.name}\n  - ${issues.join('\n  - ')}`);
  }
}
console.log(`\n${open} open items across ${STATES.length} jurisdictions.`);
process.exit(open ? 1 : 0);
