import test from 'node:test';
import assert from 'node:assert/strict';
import { screen, normalize, ValidationError } from '../src/engine/screen.js';
import { evaluateStudentRule } from '../src/engine/students.js';
import { maxAllotmentFor, grossLimitFor, bbceLimitFor, standardDeductionFor } from '../src/engine/federal.js';
import { STATES, getState } from '../src/data/states.js';

// A baseline: 22-year-old, full-time student, own household of 1, federal-only
// state (Ohio: no BBCE data), no exemption, no income.
const base = {
  state: 'OH',
  age: 22,
  enrollment: 'full_time',
  householdSize: 1,
  citizenship: 'citizen',
  housingStatus: 'stable',
  utilityMode: 'included',
};
const withWork = (hours, extra = {}) => ({ ...base, exemptions: { workHoursPerWeek: hours }, ...extra });

test('federal tables', () => {
  assert.equal(maxAllotmentFor(1), 306);
  assert.equal(maxAllotmentFor(4), 1023);
  assert.equal(maxAllotmentFor(9), 1841 + 225);
  assert.equal(grossLimitFor(1), 1729);
  assert.equal(grossLimitFor(10), 6037 + 2 * 616);
  assert.equal(standardDeductionFor(3), 217);
  assert.equal(standardDeductionFor(7), 308);
  assert.equal(bbceLimitFor(1, 200), 2660); // matches PA DHS Oct-2026 figure
  assert.equal(bbceLimitFor(4, 200), 5500);
});

test('student rule: half-time with no exemption is blocked, with suggestions', () => {
  const r = screen(base);
  assert.equal(r.status, 'student_rule_open');
  assert.equal(r.estimate, null);
  assert.ok(r.student.suggestions.length >= 2);
});

test('student rule: less-than-half-time students are not subject to it', () => {
  const r = screen({ ...base, enrollment: 'less_than_half', earnedIncome: 500, rent: 600 });
  assert.equal(r.student.applies, false);
  assert.equal(r.status, 'likely_eligible');
});

test('student rule: each exemption pathway', () => {
  const ok = (a, x) => evaluateStudentRule({ enrollment: 'half_time', age: 21, exemptions: x, ...a }).passes;
  assert.ok(ok({}, { workHoursPerWeek: 20 }));
  assert.ok(!ok({}, { workHoursPerWeek: 19.5 }));
  assert.ok(ok({}, { workStudy: 'approved' }));
  assert.ok(!ok({}, { workStudy: 'offered_not_accepted' }));
  assert.ok(ok({}, { tanf: true }));
  assert.ok(ok({}, { unfit: true }));
  assert.ok(ok({}, { caresForChildUnder6: true }));
  assert.ok(ok({}, { etProgram: true }));
  assert.ok(ok({}, { onTheJobTraining: true }));
  assert.ok(ok({ age: 50 }, {}));
  assert.ok(ok({ age: 17 }, {}));
  assert.ok(!ok({ age: 49 }, {}));
  // child 6-11 needs the childcare barrier
  assert.ok(!ok({}, { caresForChild6to11: true }));
  assert.ok(ok({}, { caresForChild6to11: true, childCareUnavailable: true }));
  // single parent exemption requires FULL-time
  assert.ok(!ok({}, { singleParent: true, caresForChildUnder12: true }));
  assert.ok(ok({ enrollment: 'full_time' }, { singleParent: true, caresForChildUnder12: true }));
  // self-employed needs 20 x $7.25 = $145/week
  assert.ok(!ok({}, { selfEmployed: true, workHoursPerWeek: 25, selfEmployedWeeklyEarnings: 144 }));
  assert.ok(ok({}, { selfEmployed: true, workHoursPerWeek: 25, selfEmployedWeeklyEarnings: 145 }));
});

test('benefit math (hand-computed): $800/mo earnings, $700 rent, utilities included', () => {
  // gross 800; -160 earned; -217 std = 423; shelter 700 - 211.5 = 488.5 excess; net 0
  const r = screen(withWork(20, { earnedIncome: 800, rent: 700 }));
  assert.equal(r.calc.afterOther, 423);
  assert.equal(r.calc.excessShelter, 488.5);
  assert.equal(r.calc.net, 0);
  assert.equal(r.estimate.monthly, 306);
  assert.equal(r.status, 'likely_eligible');
});

test('benefit math (hand-computed): $1400/mo earnings, $800 rent', () => {
  // 1400-280-217 = 903; excess 800-451.5 = 348.5; net 554.5; 30% = 166.35 -> 167; 306-167 = 139
  const r = screen(withWork(25, { earnedIncome: 1400, rent: 800 }));
  assert.equal(r.calc.net, 554.5);
  assert.equal(r.calc.thirtyPercent, 167);
  assert.equal(r.estimate.monthly, 139);
});

test('shelter deduction is capped for non-disabled, uncapped for disabled', () => {
  const hi = { earnedIncome: 900, rent: 2000 };
  const r1 = screen(withWork(20, hi));
  assert.equal(r1.calc.excessShelter, 769);
  assert.ok(r1.calc.capApplied);
  const r2 = screen(withWork(20, { ...hi, hasDisabilityBenefits: true }));
  assert.ok(r2.calc.excessShelter > 769);
  assert.ok(!r2.calc.capApplied);
});

test('medical deduction only for elderly/disabled', () => {
  const r1 = screen(withWork(20, { earnedIncome: 900, rent: 500, medical: 100 }));
  assert.equal(r1.calc.medicalDeduction, 0);
  const r2 = screen(withWork(20, { earnedIncome: 900, rent: 500, medical: 100, hasDisabilityBenefits: true }));
  assert.equal(r2.calc.medicalDeduction, 65);
});

test('minimum benefit of $25 for 1-2 person households', () => {
  // gross 1500 unearned, no shelter -> afterOther 1283, net 1283 (<1330) -> 306-385 <0 -> min 25
  const r = screen(withWork(20, { unearnedIncome: 1500 }));
  assert.equal(r.calc.formulaBenefit, 0);
  assert.equal(r.estimate.monthly, 25);
  assert.ok(r.estimate.isMinimum);
});

test('over gross limit in federal-only state: soft, encouraging result with no estimate', () => {
  const r = screen(withWork(20, { earnedIncome: 2500, rent: 700 }));
  assert.equal(r.status, 'likely_over_limit');
  assert.equal(r.estimate, null);
  assert.match(r.body, /costs nothing/);
});

test('BBCE state: same income passes in California at 200% (reported => "possible")', () => {
  const r = screen({ ...withWork(20, { earnedIncome: 2000, rent: 1400 }), state: 'CA' });
  assert.equal(r.calc.tests.federal.pass, false);
  assert.ok(r.calc.tests.bbce.pass);
  assert.equal(r.status, 'possibly_eligible');
});

test('verified BBCE state (PA) gives "likely" when a benefit results', () => {
  const r = screen({ ...withWork(20, { earnedIncome: 1750, rent: 1500 }), state: 'PA' });
  assert.equal(r.calc.tests.federal.pass, false);
  assert.ok(r.calc.tests.bbce.pass);
  assert.ok(r.estimate.monthly > 0);
  assert.equal(r.status, 'likely_eligible');
});

test('New York uses 150% unless dependent care or disability, then 200%', () => {
  const a = { ...withWork(20, { earnedIncome: 2300, rent: 1200 }), state: 'NY' };
  assert.equal(screen(a).calc.tests.bbce.pct, 150);
  assert.equal(screen({ ...a, dependentCare: 100 }).calc.tests.bbce.pct, 200);
  assert.equal(screen({ ...a, hasDisabilityBenefits: true }).calc.tests.bbce.pct, 200);
});

test('standard utility allowance used when state value known (Texas $445)', () => {
  const r = screen({ ...withWork(20, { earnedIncome: 1000, rent: 500 }), state: 'TX', utilityMode: 'pays_heat_cool' });
  assert.equal(r.calc.utility.cost, 445);
  assert.equal(r.calc.shelterCost, 945);
});

test('unknown SUA falls back to actual bills and says so', () => {
  const r = screen(withWork(20, { earnedIncome: 1000, rent: 500, utilityMode: 'pays_heat_cool', otherUtilities: 150 }));
  assert.equal(r.calc.utility.cost, 150);
  assert.ok(r.notes.some((n) => /standard utility allowance/i.test(n)));
});

test('NY regions pick the right allowance', () => {
  const r = screen({ ...withWork(20, { earnedIncome: 1000, rent: 500 }), state: 'NY', region: 'nyc', utilityMode: 'pays_heat_cool' });
  assert.equal(r.calc.utility.cost, 1062);
});

test('homeless students get the homeless shelter deduction and expedited screen', () => {
  const r = screen(withWork(20, { earnedIncome: 100, housingStatus: 'homeless', liquidAssets: 40 }));
  assert.ok(r.calc.usedHomelessDeduction);
  assert.equal(r.calc.shelterCost, 205.66);
  assert.ok(r.expedited);
});

test('assets over the federal limit in a federal-only state block the estimate', () => {
  const r = screen(withWork(20, { earnedIncome: 800, rent: 700, liquidAssets: 3500 }));
  assert.equal(r.status, 'likely_over_limit');
});

test('citizenship: undocumented → no personal estimate, supportive message', () => {
  const r = screen(withWork(20, { earnedIncome: 800, rent: 700, citizenship: 'other_or_undocumented' }));
  assert.equal(r.status, 'status_limits');
  assert.equal(r.estimate, null);
  assert.match(r.body, /children/);
});

test('citizenship: refugee/asylee (post-2025 law) flagged; LPR<5y computes with caveat', () => {
  assert.equal(screen(withWork(20, { earnedIncome: 800, rent: 700, citizenship: 'refugee_asylee_other' })).status, 'status_limits');
  const r = screen(withWork(20, { earnedIncome: 800, rent: 700, citizenship: 'lpr_under5' }));
  assert.equal(r.status, 'likely_eligible');
  assert.ok(r.notes.some((n) => /5 years/.test(n)));
});

test('"prefer not to say" never blocks', () => {
  const r = screen(withWork(20, { earnedIncome: 800, rent: 700, citizenship: 'prefer_not' }));
  assert.equal(r.status, 'likely_eligible');
});

test('privacy: screening is deterministic and does not mutate input', () => {
  const input = withWork(20, { earnedIncome: 800, rent: 700 });
  const copy = JSON.stringify(input);
  assert.deepEqual(screen(input), screen(input));
  assert.equal(JSON.stringify(input), copy);
});

test('validation', () => {
  assert.throws(() => normalize({ ...base, state: 'ZZ' }), ValidationError);
  assert.throws(() => normalize({ ...base, age: 'abc' }), ValidationError);
  assert.throws(() => normalize({ ...base, earnedIncome: -5 }), ValidationError);
  assert.throws(() => normalize({ ...base, enrollment: 'sometimes' }), ValidationError);
});

test('state data integrity: 50 states + DC, unique codes, https links', () => {
  assert.equal(STATES.length, 51);
  assert.equal(new Set(STATES.map((s) => s.code)).size, 51);
  for (const s of STATES) {
    assert.match(s.apply.url, /^https:\/\//, s.code);
    assert.ok(getState(s.code));
    assert.ok(['verified', 'reported', 'unverified'].includes(s.apply.confidence));
  }
});

test('every state runs end-to-end without error', () => {
  for (const s of STATES) {
    const r = screen(withWork(20, { earnedIncome: 1000, rent: 600, state: s.code }));
    assert.ok(r.status, s.code);
    assert.equal(r.state.code, s.code);
  }
});

test('disability benefits automatically satisfy the "unfit to work" student exemption', () => {
  const r = screen({ ...base, hasDisabilityBenefits: true, earnedIncome: 0, rent: 500 });
  assert.ok(r.student.pathways.some((p) => p.id === 'unfit'));
  assert.equal(r.status, 'likely_eligible');
});

test('skipping citizenship adds no note; student-blocked results skip income caveats', () => {
  const r = screen({ ...withWork(20, { earnedIncome: 800, rent: 700 }), citizenship: undefined });
  assert.ok(!r.notes.some((n) => /chose not to say/.test(n)));
  const blocked = screen({ ...base, state: 'WA' });
  assert.ok(!blocked.notes.some((n) => /income limit/.test(n)));
});
