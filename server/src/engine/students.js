import { FEDERAL } from './federal.js';

// 7 CFR 273.5. A student enrolled at least half-time in higher education is
// ineligible unless they meet at least one exemption. Everyone not enrolled at
// least half-time is outside this rule entirely.
//
// The pandemic-era exemptions ($0 EFC, work-study *eligibility*) ended in 2023,
// and the 2025 OBBBA law did not change this section.

const HALF_TIME_OR_MORE = new Set(['full_time', 'half_time']);

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function evaluateStudentRule(a) {
  const enrolledHalfTime = HALF_TIME_OR_MORE.has(a.enrollment);
  if (!enrolledHalfTime) {
    return {
      applies: false,
      passes: true,
      pathways: [],
      nearMisses: [],
      summary:
        a.enrollment === 'not_enrolled'
          ? 'You are not enrolled, so the student rules do not apply to you.'
          : 'You are enrolled less than half-time, so the student rules do not apply to you.',
    };
  }

  const x = a.exemptions || {};
  const pathways = [];
  const nearMisses = [];
  const age = num(a.age);

  if (age <= 17 || age >= 50) {
    pathways.push({
      id: 'age',
      label: age >= 50 ? 'Age 50 or older' : 'Age 17 or younger',
      detail: 'The student rules only apply to people ages 18 through 49.',
    });
  }

  if (x.unfit) {
    pathways.push({
      id: 'unfit',
      label: 'A physical or mental health condition',
      detail:
        'Students who are physically or mentally unable to work are exempt. This is usually shown by getting disability benefits (SSI, SSDI, VA disability) or by a doctor’s or school disability office’s statement. It does not require a specific diagnosis.',
    });
  }

  if (x.tanf) {
    pathways.push({
      id: 'tanf',
      label: 'Getting TANF (cash assistance)',
      detail: 'Students receiving TANF cash assistance are exempt.',
    });
  }

  const hours = num(x.workHoursPerWeek);
  if (x.selfEmployed) {
    const weekly = num(x.selfEmployedWeeklyEarnings);
    const needed = FEDERAL.federalMinimumWage * FEDERAL.studentWorkHoursPerWeek;
    if (hours >= FEDERAL.studentWorkHoursPerWeek && weekly >= needed) {
      pathways.push({
        id: 'work',
        label: 'Working 20+ hours a week (self-employed)',
        detail: `Self-employed students qualify when they work 20 hours a week and earn at least $${needed.toFixed(
          2,
        )} a week (federal minimum wage × 20).`,
      });
    } else if (hours > 0) {
      nearMisses.push({
        id: 'work',
        label: 'Self-employed work',
        detail: `For self-employment, the rule is 20 hours a week and at least $${needed.toFixed(
          2,
        )} in weekly earnings. Gig and freelance income varies, so ask your state whether it averages over a month or longer.`,
      });
    }
  } else if (hours >= FEDERAL.studentWorkHoursPerWeek) {
    pathways.push({
      id: 'work',
      label: 'Working 20+ hours a week',
      detail:
        'Paid work averaging 20 hours a week (about 80 hours a month) counts. Most states let you average over a month or a term, so a variable schedule can still qualify.',
    });
  } else if (hours >= 10) {
    nearMisses.push({
      id: 'work',
      label: 'Paid work under 20 hours a week',
      detail:
        'You are under the 20-hour line right now. If your hours change a lot, some states average them over a month or a term, so say how many you work in a typical busy stretch when you apply. Your schedule and school come first, and you don’t have to pick up hours just to qualify.',
    });
  }

  if (x.workStudy === 'approved') {
    pathways.push({
      id: 'workstudy',
      label: 'Approved for a work-study job',
      detail:
        'Students approved for state or federal work-study for the school term, who expect to work, qualify even at fewer than 20 hours a week. Bring your award letter when you apply.',
    });
  } else if (x.workStudy === 'offered_not_accepted') {
    nearMisses.push({
      id: 'workstudy',
      label: 'Work-study you were offered but haven’t used',
      detail:
        'Having work-study on your aid package is not enough. You need to be approved for the term and expect to work. If you accept it, you may qualify.',
    });
  }

  if (x.onTheJobTraining) {
    pathways.push({
      id: 'ojt',
      label: 'On-the-job training',
      detail: 'Counts only while your employer is actively training you.',
    });
  }

  if (x.etProgram) {
    pathways.push({
      id: 'et',
      label: 'Placed by an employment & training program',
      detail:
        'Students placed in school through SNAP Employment & Training, WIOA (Workforce Innovation and Opportunity Act), Trade Adjustment Assistance, or a qualifying state or local program for low-income people are exempt.',
    });
  }

  if (x.caresForChildUnder6) {
    pathways.push({
      id: 'child_under_6',
      label: 'Caring for a child under age 6',
      detail:
        'Students responsible for a child under 6 in their household are exempt. No work hours or full-time enrollment needed.',
    });
  }

  if (x.caresForChild6to11 && x.childCareUnavailable) {
    pathways.push({
      id: 'child_6_11',
      label: 'Caring for a child ages 6 to 11 without adequate child care',
      detail:
        'If you care for a child 6–11 and there isn’t adequate child care that lets you attend class AND meet the work/work-study requirement, you may be exempt. Your state agency makes this call, so explain your child-care situation plainly when you apply.',
    });
  } else if (x.caresForChild6to11) {
    nearMisses.push({
      id: 'child_6_11',
      label: 'Caring for a child ages 6 to 11',
      detail:
        'If child care is hard to find or afford at the times you need for class, tell the caseworker. If it isn’t available, you may qualify.',
    });
  }

  if (x.singleParent && x.caresForChildUnder12 && a.enrollment === 'full_time') {
    pathways.push({
      id: 'single_parent',
      label: 'Single parent enrolled full-time with a child under 12',
      detail:
        'A single parent enrolled full-time (as your school defines it) who cares for a child under 12 is exempt.',
    });
  } else if (x.singleParent && x.caresForChildUnder12 && a.enrollment === 'half_time') {
    nearMisses.push({
      id: 'single_parent',
      label: 'Single parent with a child under 12',
      detail:
        'This exemption requires full-time enrollment. Ask your registrar whether any of your credits or sections would make you full-time by your school’s definition.',
    });
  }

  const passes = pathways.length > 0;

  // Always-on suggestions for people who don't (yet) have a pathway.
  const suggestions = [];
  if (!passes) {
    if (x.workStudy !== 'offered_not_accepted') {
      suggestions.push({
        id: 'ask_workstudy',
        label: 'Ask your financial aid office about work-study',
        detail:
          'Students approved for work-study for the term qualify without needing 20 hours. Many schools can tell you if you’re eligible even late in the year.',
      });
    }
    suggestions.push({
      id: 'ask_et',
      label: 'Ask if your school has a SNAP Employment & Training partnership',
      detail:
        'Some community colleges and universities place students in SNAP E&T programs that satisfy the student rule. A campus basic needs office or the state SNAP office can tell you.',
    });
    suggestions.push({
      id: 'ask_basic_needs',
      label: 'Connect with your campus basic needs office',
      detail:
        'They know your state’s student rules, often help with applications, and may offer a campus food pantry or emergency aid in the meantime.',
    });
  }

  return {
    applies: true,
    passes,
    pathways,
    nearMisses,
    suggestions,
    summary: passes
      ? 'You meet at least one student exemption.'
      : 'The student rule asks for one more piece, but there are several doors that could open it.',
  };
}
