// Federal SNAP parameters, FY2027 (effective 2026-10-01), 48 states + DC.
// Source: USDA FNS FY2027 COLA memo (Aug 21, 2026), as reproduced by secondary
// sources because fns.usda.gov was unreachable when this was written.
// >>> Re-verify against the memo before public launch, and refresh every October. <<<

export const FEDERAL = {
  fiscalYear: 'FY2027',
  effective: '2026-10-01',

  // Index = household size (index 0 unused).
  maxAllotment: [0, 306, 562, 808, 1023, 1217, 1463, 1616, 1841],
  maxAllotmentPerAdditional: 225,

  // 130% of poverty (gross) and 100% of poverty (net), monthly.
  grossLimit130: [0, 1729, 2345, 2960, 3575, 4191, 4806, 5421, 6037],
  grossPerAdditional: 616,
  netLimit100: [0, 1330, 1804, 2277, 2750, 3224, 3697, 4170, 4644],
  netPerAdditional: 474,

  // Standard deduction by household size. NOTE: sources disagreed on size 4
  // ($229 vs $231). Effect on a benefit is under $1, but confirm.
  standardDeduction: { '1-3': 217, 4: 229, 5: 268, '6+': 308 },

  earnedIncomeDeductionRate: 0.2,
  benefitReductionRate: 0.3, // benefit = max allotment - 30% of net income
  excessShelterCap: 769, // not applied to households with an elderly/disabled member
  homelessShelterDeduction: 205.66,
  medicalDeductionThreshold: 35, // elderly/disabled only
  minimumBenefit: 25, // 1-2 person households
  resourceLimit: 3000,
  resourceLimitElderlyDisabled: 4750,

  // Expedited (7-day) processing screens, 7 CFR 273.2(i).
  expedited: { maxGrossIncome: 150, maxLiquidResources: 100 },

  // Student rule 7 CFR 273.5: self-employed students must earn at least
  // federal minimum wage x 20 hours per week.
  federalMinimumWage: 7.25,
  studentWorkHoursPerWeek: 20,
};

const clampSize = (n) => Math.max(1, Math.round(n));

function tableValue(table, perAdditional, size) {
  const n = clampSize(size);
  if (n <= 8) return table[n];
  return table[8] + perAdditional * (n - 8);
}

export const maxAllotmentFor = (size) =>
  tableValue(FEDERAL.maxAllotment, FEDERAL.maxAllotmentPerAdditional, size);
export const grossLimitFor = (size) =>
  tableValue(FEDERAL.grossLimit130, FEDERAL.grossPerAdditional, size);
export const netLimitFor = (size) =>
  tableValue(FEDERAL.netLimit100, FEDERAL.netPerAdditional, size);

export function standardDeductionFor(size) {
  const n = clampSize(size);
  if (n <= 3) return FEDERAL.standardDeduction['1-3'];
  if (n === 4) return FEDERAL.standardDeduction[4];
  if (n === 5) return FEDERAL.standardDeduction[5];
  return FEDERAL.standardDeduction['6+'];
}

// BBCE limits are expressed as % of poverty. 100% of poverty == the net limit.
export const bbceLimitFor = (size, pct) => Math.round((netLimitFor(size) * pct) / 100);
