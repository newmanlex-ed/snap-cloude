import {
  FEDERAL,
  maxAllotmentFor,
  grossLimitFor,
  netLimitFor,
  standardDeductionFor,
  bbceLimitFor,
} from './federal.js';
import { evaluateStudentRule } from './students.js';
import { getState, programName, FNS_STATE_DIRECTORY, STATES_AS_OF } from '../data/states.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const ENROLLMENT = ['full_time', 'half_time', 'less_than_half', 'not_enrolled'];
const CITIZENSHIP = [
  'citizen',
  'lpr_5plus',
  'lpr_under5',
  'refugee_asylee_other',
  'cuban_haitian_cofa',
  'other_or_undocumented',
  'not_sure',
  'prefer_not',
];
const UTILITY_MODE = ['included', 'pays_heat_cool', 'pays_other_only'];
const HOUSING = ['stable', 'unstable', 'homeless'];
const WORK_STUDY = ['no', 'approved', 'offered_not_accepted'];

const money = (v, name, max = 1_000_000) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new ValidationError(`${name} must be a number from 0 to ${max}.`);
  return n;
};
const oneOf = (v, list, name, dflt) => {
  if (v === undefined || v === null || v === '') return dflt;
  if (!list.includes(v)) throw new ValidationError(`${name} must be one of: ${list.join(', ')}.`);
  return v;
};
const r2 = (n) => Math.round(n * 100) / 100;

export function normalize(raw = {}) {
  const state = getState(raw.state);
  if (!state) throw new ValidationError('Please choose your state.');

  const age = Number(raw.age);
  if (!Number.isFinite(age) || age < 14 || age > 110) throw new ValidationError('Please enter your age (14–110).');

  const householdSize = Math.round(Number(raw.householdSize ?? 1));
  if (!Number.isFinite(householdSize) || householdSize < 1 || householdSize > 20)
    throw new ValidationError('Household size must be between 1 and 20.');

  const x = raw.exemptions || {};
  return {
    state: state.code,
    region: raw.region ? String(raw.region) : undefined,
    age,
    enrollment: oneOf(raw.enrollment, ENROLLMENT, 'enrollment', 'not_enrolled'),
    exemptions: {
      // Getting disability benefits (SSI, SSDI, VA) is itself proof of being unfit to work.
      unfit: !!x.unfit || !!raw.hasDisabilityBenefits,
      tanf: !!x.tanf,
      workHoursPerWeek: money(x.workHoursPerWeek, 'workHoursPerWeek', 168),
      selfEmployed: !!x.selfEmployed,
      selfEmployedWeeklyEarnings: money(x.selfEmployedWeeklyEarnings, 'selfEmployedWeeklyEarnings'),
      workStudy: oneOf(x.workStudy, WORK_STUDY, 'workStudy', 'no'),
      onTheJobTraining: !!x.onTheJobTraining,
      etProgram: !!x.etProgram,
      caresForChildUnder6: !!x.caresForChildUnder6,
      caresForChild6to11: !!x.caresForChild6to11,
      childCareUnavailable: !!x.childCareUnavailable,
      singleParent: !!x.singleParent,
      caresForChildUnder12: !!x.caresForChildUnder12,
    },
    householdSize,
    under22WithParents: !!raw.under22WithParents,
    citizenship: oneOf(raw.citizenship, CITIZENSHIP, 'citizenship', 'skipped'),
    hasDisabilityBenefits: !!raw.hasDisabilityBenefits,
    otherMemberElderlyOrDisabled: !!raw.otherMemberElderlyOrDisabled,
    earnedIncome: money(raw.earnedIncome, 'earnedIncome'),
    unearnedIncome: money(raw.unearnedIncome, 'unearnedIncome'),
    nonFederalAidForLiving: money(raw.nonFederalAidForLiving, 'nonFederalAidForLiving'),
    liquidAssets: money(raw.liquidAssets, 'liquidAssets'),
    housingStatus: oneOf(raw.housingStatus, HOUSING, 'housingStatus', 'stable'),
    rent: money(raw.rent, 'rent'),
    utilityMode: oneOf(raw.utilityMode, UTILITY_MODE, 'utilityMode', 'included'),
    otherUtilities: money(raw.otherUtilities, 'otherUtilities'),
    dependentCare: money(raw.dependentCare, 'dependentCare'),
    childSupportPaid: money(raw.childSupportPaid, 'childSupportPaid'),
    medical: money(raw.medical, 'medical'),
    hasMealPlan: oneOf(raw.hasMealPlan, ['none', 'partial', 'full'], 'hasMealPlan', 'none'),
  };
}

function evaluateCitizenship(a) {
  switch (a.citizenship) {
    case 'citizen':
    case 'lpr_5plus':
    case 'cuban_haitian_cofa':
      return { status: 'yes' };
    case 'lpr_under5':
      return {
        status: 'maybe',
        message:
          'Green card holders usually need to have held status for 5 years, but there are exceptions: having a disability, military service, about 10 years of work history, or being under 18. The estimate below assumes an exception applies, so please confirm with your state or a legal aid group.',
      };
    case 'refugee_asylee_other':
      return {
        status: 'maybe',
        message:
          'A 2025 federal law narrowed who can get SNAP. Refugees, asylees and similar groups are no longer eligible unless they have also become permanent residents (green card holders). If you have, choose that option instead. If not, you may not qualify yourself, but other people in your home, like children who are U.S. citizens, still can.',
        blockingUnlessAdjusted: true,
      };
    case 'other_or_undocumented':
      return {
        status: 'no',
        message:
          'You may not be able to get SNAP for yourself, but children in your home who are U.S. citizens or eligible immigrants can be approved on their own, and applying for them is allowed. A free immigration legal aid group can explain how this works in your situation before you decide anything.',
      };
    case 'skipped':
      return { status: 'yes' };
    default:
      return {
        status: 'unknown',
        message:
          'You chose not to say or aren’t sure. That’s completely okay. We’ve assumed you’re eligible on this point. A navigator or legal aid organization can help you check.',
      };
  }
}

function resolveSua(state, a) {
  const sua = state.sua;
  if (!sua) return null;
  if (sua.regions && a.region) {
    const r = sua.regions.find((x) => x.id === a.region);
    if (r) return { ...sua, amount: r.amount, regionLabel: r.label };
  }
  return sua;
}

export function calculate(a, state) {
  const size = a.householdSize;
  const age = a.age;
  const elderlyOrDisabled = age >= 60 || a.hasDisabilityBenefits || a.otherMemberElderlyOrDisabled;

  const earned = a.earnedIncome;
  const unearned = a.unearnedIncome;
  const aid = a.nonFederalAidForLiving;
  const gross = earned + unearned + aid;

  const earnedDeduction = r2(earned * FEDERAL.earnedIncomeDeductionRate);
  const standardDeduction = standardDeductionFor(size);
  const dependentCare = a.dependentCare;
  const childSupport = a.childSupportPaid;
  const medicalDeduction = elderlyOrDisabled ? Math.max(0, r2(a.medical - FEDERAL.medicalDeductionThreshold)) : 0;

  const afterOther = Math.max(0, r2(gross - earnedDeduction - standardDeduction - dependentCare - childSupport - medicalDeduction));

  // Utilities
  const sua = resolveSua(state, a);
  let utilityCost = 0;
  let utilityBasis = 'none';
  if (a.utilityMode === 'pays_heat_cool') {
    if (sua) {
      utilityCost = sua.amount;
      utilityBasis = 'sua';
    } else {
      utilityCost = a.otherUtilities;
      utilityBasis = 'actual_no_sua';
    }
  } else if (a.utilityMode === 'pays_other_only') {
    utilityCost = a.otherUtilities;
    utilityBasis = 'actual';
  }

  let shelterCost = a.rent + utilityCost;
  let usedHomelessDeduction = false;
  if (a.housingStatus === 'homeless' && shelterCost < FEDERAL.homelessShelterDeduction) {
    shelterCost = FEDERAL.homelessShelterDeduction;
    usedHomelessDeduction = true;
  }
  const halfIncome = r2(afterOther / 2);
  const rawExcess = Math.max(0, r2(shelterCost - halfIncome));
  const capApplies = !elderlyOrDisabled;
  const excessShelter = capApplies ? Math.min(rawExcess, FEDERAL.excessShelterCap) : rawExcess;
  const net = Math.max(0, r2(afterOther - excessShelter));

  const maxAllot = maxAllotmentFor(size);
  const thirty = Math.ceil(net * FEDERAL.benefitReductionRate - 1e-9);
  const formulaBenefit = Math.max(0, maxAllot - thirty);

  // ---- Eligibility tests ----
  const grossLimit = grossLimitFor(size);
  const netLimit = netLimitFor(size);
  const assetLimit = elderlyOrDisabled ? FEDERAL.resourceLimitElderlyDisabled : FEDERAL.resourceLimit;

  const federal = {
    gross: { pass: elderlyOrDisabled || gross <= grossLimit, limit: grossLimit, skipped: elderlyOrDisabled },
    net: { pass: net <= netLimit, limit: netLimit },
    assets: { pass: a.liquidAssets <= assetLimit, limit: assetLimit },
  };
  federal.pass = federal.gross.pass && federal.net.pass && federal.assets.pass;

  let bbce = null;
  if (state.bbce) {
    const b = state.bbce;
    let pct = b.grossPct;
    if (b.grossPctAlt && (elderlyOrDisabled || a.dependentCare > 0)) pct = b.grossPctAlt.pct;
    const limit = bbceLimitFor(size, pct);
    const assetOk =
      b.assetTest === 'none' ? true : b.assetTest === 'federal' ? federal.assets.pass : a.liquidAssets <= Number(b.assetTest);
    bbce = {
      pct,
      limit,
      confidence: b.confidence,
      gross: { pass: elderlyOrDisabled || gross <= limit },
      assets: { pass: assetOk, rule: b.assetTest },
    };
    bbce.pass = bbce.gross.pass && bbce.assets.pass;
  }

  const eligibleOnPaper = federal.pass || (bbce && bbce.pass);
  let benefit = 0;
  if (eligibleOnPaper) {
    benefit = formulaBenefit;
    if (size <= 2 && net <= netLimit && benefit < FEDERAL.minimumBenefit) benefit = FEDERAL.minimumBenefit;
  }

  // Expedited (7-day) processing screen
  const liquid = a.liquidAssets;
  const expedited =
    (gross < FEDERAL.expedited.maxGrossIncome && liquid <= FEDERAL.expedited.maxLiquidResources) ||
    (shelterCost > gross + liquid && (a.rent > 0 || a.housingStatus === 'homeless'));

  return {
    elderlyOrDisabled,
    gross: r2(gross),
    earnedDeduction,
    standardDeduction,
    dependentCare,
    childSupport,
    medicalDeduction,
    afterOther,
    utility: { cost: utilityCost, basis: utilityBasis, sua },
    shelterCost: r2(shelterCost),
    usedHomelessDeduction,
    halfIncome,
    rawExcess,
    excessShelter: r2(excessShelter),
    capApplied: capApplies && rawExcess > FEDERAL.excessShelterCap,
    net,
    maxAllot,
    thirtyPercent: thirty,
    formulaBenefit,
    benefit,
    eligibleOnPaper,
    tests: { federal, bbce },
    expedited,
  };
}

const $ = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

function buildRationale(a, state, c) {
  const rows = [];
  rows.push({
    key: 'household',
    label: 'Household size',
    value: `${a.householdSize} ${a.householdSize === 1 ? 'person' : 'people'}`,
    why: `SNAP counts everyone who buys and prepares food together. The most a household of ${a.householdSize} can get is ${$(c.maxAllot)} a month.`,
  });
  rows.push({
    key: 'gross',
    label: 'Income counted each month',
    amount: c.gross,
    why: 'Your paychecks, plus other regular income like benefits, child support you receive, or non-federal scholarship money meant for living costs. Federal aid (Pell, federal work-study, federal loans) and money used for tuition or fees is NOT counted.',
  });
  if (c.earnedDeduction)
    rows.push({ key: 'earned', label: 'Work deduction (20%)', amount: -c.earnedDeduction, why: 'SNAP lets you set aside 20% of what you earn, recognizing the costs of working.' });
  rows.push({ key: 'std', label: 'Standard deduction', amount: -c.standardDeduction, why: 'Everyone gets a basic deduction for the cost of living, set by household size.' });
  if (c.dependentCare)
    rows.push({ key: 'depcare', label: 'Child or dependent care', amount: -c.dependentCare, why: 'Care costs you pay so you can work or attend school are deducted.' });
  if (c.childSupport)
    rows.push({ key: 'cs', label: 'Child support you pay', amount: -c.childSupport, why: 'Child support paid to someone outside your home can be deducted (states can choose how). We included it.' });
  if (c.medicalDeduction)
    rows.push({ key: 'med', label: 'Medical costs over $35', amount: -c.medicalDeduction, why: 'Out-of-pocket medical costs for people 60+ or with a disability, over $35 a month.' });
  rows.push({ key: 'after', label: 'Income after those deductions', amount: c.afterOther, subtotal: true });
  rows.push({
    key: 'shelter',
    label: 'Housing + utilities',
    amount: c.shelterCost,
    why: c.usedHomelessDeduction
      ? `Because you don’t have stable housing, SNAP lets you use a standard housing amount of ${$(FEDERAL.homelessShelterDeduction)} even without rent.`
      : c.utility.basis === 'sua'
        ? `Rent plus the state’s standard utility allowance (${$(c.utility.sua.amount)}${c.utility.sua.regionLabel ? `, ${c.utility.sua.regionLabel}` : ''}) because you pay heating or cooling.`
        : c.utility.basis === 'actual_no_sua'
          ? 'Rent plus the utility costs you told us. Your state likely uses a standard utility allowance we don’t have yet, which could make your benefit higher.'
          : 'Rent plus the utility costs you told us (not including internet, which no longer counts).',
  });
  if (c.excessShelter > 0)
    rows.push({
      key: 'excess',
      label: 'Housing deduction',
      amount: -c.excessShelter,
      why: `SNAP deducts the part of your housing costs that is more than half of your remaining income${c.capApplied ? `, up to a ${$(FEDERAL.excessShelterCap)} limit (that limit doesn’t apply if someone is 60+ or has a disability)` : ''}.`,
    });
  rows.push({ key: 'net', label: 'Net income', amount: c.net, subtotal: true, why: 'This is what SNAP treats as the money you have available for food.' });
  rows.push({
    key: 'thirty',
    label: 'Expected food contribution (30% of net)',
    amount: -c.thirtyPercent,
    why: 'SNAP assumes a household can put about 30 cents of each net dollar toward food. SNAP covers the rest.',
  });
  rows.push({
    key: 'benefit',
    label: 'Estimated monthly benefit',
    amount: c.benefit,
    total: true,
    why:
      c.benefit === FEDERAL.minimumBenefit && c.formulaBenefit < FEDERAL.minimumBenefit
        ? `The math came to under ${$(FEDERAL.minimumBenefit)}, but 1–2 person households who qualify get at least ${$(FEDERAL.minimumBenefit)}.`
        : `${$(c.maxAllot)} (maximum for your household) − ${$(c.thirtyPercent)} = ${$(c.formulaBenefit)}.`,
  });
  return rows;
}

function buildNotes(a, state, c, cit, student) {
  const notes = [];
  // Income-rule caveats only matter once the student rule isn't the blocker.
  const incomeRelevant = !(student.applies && !student.passes);
  if (!incomeRelevant) {
    if (cit.message && cit.status !== 'yes') notes.push(cit.message);
    return notes;
  }
  if (!state.bbce) {
    notes.push(
      `We don’t yet have verified data on ${state.name}’s income rules, so we used the federal limits. Many states allow higher incomes, so a result of “over the limit” here may not be the final word. Apply anyway and let the state decide.`,
    );
  } else if (state.bbce.confidence !== 'verified') {
    notes.push(`${state.name}’s higher income limit (${state.bbce.grossPct}% of poverty) comes from sources we haven’t fully confirmed. We’ve labeled results that rely on it as “possible.”`);
  }
  if (c.utility.basis === 'actual_no_sua') {
    notes.push('We used your own utility bills. Your state may count a standard utility allowance instead, which would likely raise your estimate.');
  }
  if (state.note) notes.push(state.note);
  if (a.under22WithParents) {
    notes.push('Because you’re under 22 and live with your parents, most states require applying together with them. In that case their income counts too. Make sure the household size and income above include them.');
  }
  if (a.hasMealPlan !== 'none') {
    notes.push('You mentioned a campus meal plan. Tell the caseworker about it. Rules about meal plans vary by state and can affect your benefit.');
  }
  if (cit.message && cit.status !== 'yes') notes.push(cit.message);
  if (student.applies && student.passes) {
    notes.push('Bring proof for your exemption (pay stubs, work-study award letter, a letter from your school, etc.). Students are commonly asked for it.');
  }
  return notes;
}

function buildNextSteps(a, state, c, student, expedited) {
  const steps = [];
  if (expedited) {
    steps.push('Ask for “expedited” processing. Based on what you shared, you may qualify to get benefits within 7 days.');
  }
  steps.push('Gather what you have. You don’t need everything to start applying: photo ID, proof of any income, your lease or rent amount, utility bills, and your school enrollment.');
  if (student.applies) {
    steps.push('Tell the caseworker you’re a student and which exemption fits you. Ask them to note it in your case.');
  }
  steps.push('Expect a short interview (usually by phone). You can ask for it to be scheduled around class and work.');
  steps.push('If you’re denied or the amount seems off, you can ask for a review (a “fair hearing”) and reapply any time your situation changes. A denial isn’t permanent.');
  return steps;
}

export function screen(raw) {
  const a = normalize(raw);
  const state = getState(a.state);
  const student = evaluateStudentRule(a);
  const cit = evaluateCitizenship(a);
  const c = calculate(a, state);

  const base = {
    meta: { fiscalYear: FEDERAL.fiscalYear, stateDataAsOf: STATES_AS_OF },
    state: {
      code: state.code,
      name: state.name,
      program: programName(state),
      applyUrl: state.apply.url,
      applyKind: state.apply.kind,
      applyConfidence: state.apply.confidence,
      directoryUrl: FNS_STATE_DIRECTORY,
    },
    student,
    citizenship: cit,
    calc: c,
  };

  let status;
  let headline;
  let body;

  if (student.applies && !student.passes) {
    status = 'student_rule_open';
    headline = 'One piece is missing, and there are ways to find it.';
    body = `Students enrolled at least half-time need to meet one extra rule before ${programName(state)} can start. You don’t meet one yet based on your answers, but several common routes are listed below, and your campus basic needs office can help you check each one.`;
  } else if (cit.status === 'no' || (cit.status === 'maybe' && cit.blockingUnlessAdjusted)) {
    status = 'status_limits';
    headline = 'You may not qualify for yourself, but others in your home might.';
    body = cit.message;
  } else if (c.tests.federal.pass) {
    status = 'likely_eligible';
    headline = 'You likely qualify. This is exactly who SNAP is for.';
    body = `Based on your answers, you appear to meet ${programName(state)}’s rules. Only ${state.name} can make the final decision, so apply, and a short application doesn’t commit you to anything.`;
  } else if (c.tests.bbce && c.tests.bbce.pass) {
    const confirmed = c.tests.bbce.confidence === 'verified';
    status = confirmed && c.benefit > 0 ? 'likely_eligible' : 'possibly_eligible';
    headline = confirmed && c.benefit > 0 ? 'You likely qualify.' : 'You may qualify, and it’s worth applying to find out.';
    body = `Your income is above the basic federal limit, but ${state.name} reports a higher limit (${c.tests.bbce.pct}% of poverty). ${
      confirmed ? '' : 'We haven’t been able to fully confirm that figure, so treat this as a “likely worth applying.” '
    }The state decides.`;
  } else {
    status = 'likely_over_limit';
    headline = 'On these numbers you’re a bit over the limit. Apply anyway if anything has changed.';
    body = `Eligibility depends on details we can only estimate, such as exact expenses, a recent income drop, or rules your state has that we haven’t verified. If your income has gone down, your costs are higher than you entered, or you’re unsure, applying costs nothing and the state will calculate it precisely.`;
  }

  const showEstimate = ['likely_eligible', 'possibly_eligible'].includes(status) && c.benefit > 0;
  const dataNotes = buildNotes(a, state, c, cit, student);

  return {
    ...base,
    status,
    headline,
    body,
    estimate: showEstimate ? { monthly: c.benefit, isMinimum: c.benefit === FEDERAL.minimumBenefit && c.formulaBenefit < FEDERAL.minimumBenefit } : null,
    rationale: showEstimate || status === 'likely_over_limit' ? buildRationale(a, state, c) : null,
    notes: dataNotes,
    expedited: c.expedited && ['likely_eligible', 'possibly_eligible'].includes(status),
    nextSteps: buildNextSteps(a, state, c, student, c.expedited && ['likely_eligible', 'possibly_eligible'].includes(status)),
  };
}
