// All screener content lives here so it can be reviewed (and translated) by
// non-engineers. Every question has:
//   why      → plain-language reason we ask
//   student  → how a student's unusual circumstances can change the answer
// Principles (Poverty-Informed Practice): no jargon, no judgment, nothing
// required, "not sure" is always a valid answer, and we name structural
// realities (rent, aid gaps, unstable hours) instead of blaming the person.

const yesNo = (v) => !!v;

export const STEPS = [
  {
    id: 'where',
    title: 'About you',
    intro: 'Let’s start with the basics. Your state decides your case, so this changes which rules we use.',
    fields: [
      {
        id: 'state',
        type: 'state',
        label: 'Which state do you live in while you’re in school?',
        why: 'Every state runs SNAP a little differently: income limits, utility allowances, and where you apply. We use your state’s rules where we have them.',
        student:
          'Go to school in one state but have family in another? Use the state where you live most of the year and would apply. If you’re not sure, pick your school’s state. You can only get SNAP from one state at a time.',
        required: true,
      },
      {
        id: 'region',
        type: 'region',
        label: 'Which part of New York?',
        why: 'New York sets different utility allowances for different regions.',
        showIf: (a) => a.state === 'NY',
      },
      {
        id: 'age',
        type: 'number',
        label: 'How old are you?',
        why: 'The extra student rules only apply to people ages 18 to 49, and age also affects how we figure out your household.',
        student:
          'Being older or younger doesn’t make you less deserving. It just changes which rules apply. If you’re under 22 and live with your parents, you’ll see a question about that soon.',
        required: true,
        min: 14,
        max: 110,
        unit: 'years',
      },
    ],
  },
  {
    id: 'school',
    title: 'Your school situation',
    intro: 'SNAP has one rule just for college students. This tells us whether it applies to you.',
    fields: [
      {
        id: 'enrollment',
        type: 'radio',
        label: 'How are you enrolled right now?',
        why: 'SNAP has a special rule for people enrolled at least half-time in college, university, or a career/technical program that usually requires a high school diploma. If you’re below half-time or not enrolled, that rule doesn’t apply to you.',
        student:
          'Not sure how your school counts credits? Your registrar or financial aid office can answer in one email. Your status generally carries through normal breaks, but it ends if you won’t register for next term. Summer-only classes don’t count. A certificate program that admits people without a high school diploma usually isn’t covered by the rule.',
        required: true,
        options: [
          { value: 'full_time', label: 'Full-time (by my school’s definition)' },
          { value: 'half_time', label: 'At least half-time, but not full-time' },
          { value: 'less_than_half', label: 'Less than half-time' },
          { value: 'not_enrolled', label: 'Not enrolled right now' },
        ],
      },
    ],
  },
  {
    id: 'exemptions',
    title: 'Ways students qualify',
    intro:
      'Students enrolled at least half-time can get SNAP if just one of these is true for them. Check anything that fits. You only need one, and it’s fine if none do. We’ll show you other options.',
    showIf: (a) => a.enrollment === 'full_time' || a.enrollment === 'half_time',
    fields: [
      {
        id: 'workHoursPerWeek',
        path: 'exemptions.workHoursPerWeek',
        type: 'number',
        label: 'In a typical week, about how many hours do you work for pay?',
        why: 'Working an average of 20 hours a week (about 80 a month) is the most common way students qualify.',
        student:
          'Hours change with the semester? Give your usual average. Most states let you average over a month or a term. Include on-campus jobs, gig work, tutoring, and informal work you’re paid for. Leave out unpaid internships and volunteering for this question. Don’t add hours just to qualify. There are other routes.',
        unit: 'hours / week',
        min: 0,
        max: 100,
        step: 0.5,
      },
      {
        id: 'selfEmployed',
        path: 'exemptions.selfEmployed',
        type: 'checkbox',
        label: 'That work is self-employment (freelance, gig apps, my own business)',
        why: 'Self-employed students are held to an earnings test too: at least 20 hours a week and weekly earnings of at least the federal minimum wage × 20.',
      },
      {
        id: 'selfEmployedWeeklyEarnings',
        path: 'exemptions.selfEmployedWeeklyEarnings',
        type: 'money',
        label: 'About how much do you earn per week from that, after business costs?',
        showIf: (a) => yesNo(a.exemptions?.selfEmployed),
        unit: '$ / week',
      },
      {
        id: 'workStudy',
        path: 'exemptions.workStudy',
        type: 'radio',
        defaultValue: 'no',
        label: 'Work-study',
        why: 'Being approved for work-study for the school term counts, even if it’s fewer than 20 hours a week.',
        student:
          'Seeing work-study in your aid package isn’t enough. You need to be approved for the term and expect to work. Haven’t accepted it? Your financial aid office can often tell you whether you can still be approved. Bring your award letter when you apply.',
        options: [
          { value: 'no', label: 'No work-study' },
          { value: 'approved', label: 'Approved for this term and I expect to work' },
          { value: 'offered_not_accepted', label: 'It’s on my aid offer but I haven’t been approved or started' },
        ],
      },
      {
        id: 'hasDisabilityBenefits',
        type: 'checkbox',
        label: 'I receive disability benefits (SSI, SSDI, or VA disability)',
        why: 'Students who can’t work because of a physical or mental health condition are exempt. Receiving disability benefits is the clearest proof. It also changes how some deductions work, in your favor.',
      },
      {
        id: 'unfit',
        path: 'exemptions.unfit',
        type: 'checkbox',
        label: 'A physical or mental health condition (including mental health, chronic illness, or learning disabilities) limits my ability to work, even if I don’t get disability benefits',
        why: 'You don’t need a particular diagnosis. A statement from a doctor, therapist, or your school’s disability services office can be enough, and the state decides.',
        student:
          'Many students with conditions never think of themselves as “disabled.” If a condition affects your ability to hold a job, check this box. You can describe it in your own words at your interview.',
      },
      {
        id: 'tanf',
        path: 'exemptions.tanf',
        type: 'checkbox',
        label: 'I receive TANF (cash assistance for families)',
        why: 'People getting TANF are exempt from the student rule.',
      },
      {
        id: 'caresForChildUnder6',
        path: 'exemptions.caresForChildUnder6',
        type: 'checkbox',
        label: 'I care for a child under age 6 who lives with me',
        why: 'Caring for a young child is full-time work, so SNAP exempts student caregivers. You don’t need to work or study full-time.',
        student: 'This covers siblings, nieces and nephews, and grandchildren you’re raising too, not just your own children.',
      },
      {
        id: 'caresForChild6to11',
        path: 'exemptions.caresForChild6to11',
        type: 'checkbox',
        label: 'I care for a child ages 6 to 11 who lives with me',
        why: 'If affordable, reliable child care isn’t available at the times you need it for class, you may qualify.',
      },
      {
        id: 'childCareUnavailable',
        path: 'exemptions.childCareUnavailable',
        type: 'checkbox',
        label: 'Child care that lets me attend class and meet work requirements isn’t available to me',
        showIf: (a) => yesNo(a.exemptions?.caresForChild6to11),
        why: 'The state makes the final call. Explain what you’ve tried: cost, waitlists, hours that don’t match your classes.',
      },
      {
        id: 'singleParent',
        path: 'exemptions.singleParent',
        type: 'checkbox',
        label: 'I’m a single parent (or the only adult caring for a child under 12)',
        why: 'Single parents enrolled full-time who care for a child under 12 are exempt.',
        showIf: (a) => a.enrollment === 'full_time' || a.enrollment === 'half_time',
      },
      {
        id: 'caresForChildUnder12',
        path: 'exemptions.caresForChildUnder12',
        type: 'checkbox',
        label: 'The child I care for is under 12',
        showIf: (a) => yesNo(a.exemptions?.singleParent),
      },
      {
        id: 'etProgram',
        path: 'exemptions.etProgram',
        type: 'checkbox',
        label: 'I’m in school through an employment & training program (like SNAP E&T, WIOA, or Job Corps-type programs)',
        why: 'Students placed in school by these programs are exempt. Some community colleges partner with their state to do this.',
        student: 'Not sure? Ask your campus basic needs or career office, “Do we have a SNAP Employment & Training partnership?”',
      },
      {
        id: 'onTheJobTraining',
        path: 'exemptions.onTheJobTraining',
        type: 'checkbox',
        label: 'I’m in on-the-job training (an employer is training me, like an apprenticeship)',
        why: 'This counts while your employer is actively training you.',
      },
    ],
  },
  {
    id: 'household',
    title: 'Your household',
    intro: 'SNAP counts people who share food, not just people who share an address. This is often the trickiest part for students, so take your time.',
    fields: [
      {
        id: 'householdSize',
        type: 'number',
        label: 'Counting yourself, how many people live with you and buy and prepare food together?',
        why: 'The more people in your food household, the higher the income limit and the bigger the benefit.',
        student:
          'Roommates who each buy and cook their own food are usually separate households, so count only yourself. A partner you share food with counts. So do children you care for. If you live with parents and are under 22, count them (see next question). Dorm with a meal plan? See below.',
        required: true,
        min: 1,
        max: 20,
        unit: 'people',
        defaultValue: 1,
      },
      {
        id: 'under22WithParents',
        type: 'checkbox',
        label: 'I’m under 22 and I live with my parents',
        why: 'In most states, someone under 22 who lives with their parents has to apply with them, and the parents’ income counts too.',
        student:
          'Live away at school and buy your own food? Many states treat you as separate, but it varies, and the answer can depend on whether you’re a dependent on their taxes. Don’t assume. Ask the state. If this box applies, include your parents in the household size and their income in the income step.',
      },
      {
        id: 'hasMealPlan',
        type: 'radio',
        defaultValue: 'none',
        label: 'Do you have a campus meal plan?',
        why: 'Meals provided by your school can affect SNAP. We can’t calculate that exactly, but we’ll flag it so you can tell the caseworker.',
        options: [
          { value: 'none', label: 'No meal plan' },
          { value: 'partial', label: 'Part of my meals (e.g., 5–10 meals a week)' },
          { value: 'full', label: 'Most or all of my meals' },
        ],
      },
      {
        id: 'otherMemberElderlyOrDisabled',
        type: 'checkbox',
        label: 'Someone in my household is 60 or older, or has a disability',
        why: 'Households with an older adult or a person with a disability get extra deductions and different income and savings rules.',
      },
      {
        id: 'citizenship',
        type: 'select',
        label: 'Which best describes your citizenship or immigration status?',
        why: 'SNAP has rules about who can be approved, and they changed in 2025. This is only used to tell you whether to expect an estimate. It isn’t stored or shared by this tool.',
        student:
          'You can choose “I’d rather not say.” Even if you personally can’t get SNAP, children in your home who are U.S. citizens can often be approved on their own, and applying for them is allowed. If you have worries about how applying could affect your immigration case, talk to a free immigration legal aid organization first.',
        options: [
          { value: 'citizen', label: 'U.S. citizen or national' },
          { value: 'lpr_5plus', label: 'Green card holder (5+ years)' },
          { value: 'lpr_under5', label: 'Green card holder (less than 5 years)' },
          { value: 'cuban_haitian_cofa', label: 'Cuban/Haitian entrant, or from a Compact of Free Association nation (Marshall Islands, Micronesia, Palau)' },
          { value: 'refugee_asylee_other', label: 'Refugee, asylee, or similar (no green card yet)' },
          { value: 'other_or_undocumented', label: 'Another status, or no status' },
          { value: 'not_sure', label: 'I’m not sure' },
          { value: 'prefer_not', label: 'I’d rather not say' },
        ],
      },
    ],
  },
  {
    id: 'income',
    title: 'Money coming in',
    intro: 'Rough numbers are fine. Use monthly amounts before taxes, for everyone in your household. Leave anything blank that’s $0 or doesn’t apply.',
    fields: [
      {
        id: 'earnedIncome',
        type: 'money',
        label: 'Money from jobs each month (before taxes)',
        why: 'Wages are the main thing SNAP counts, but only 80% of them. A fifth is set aside for work costs.',
        student:
          'Paid unevenly (tips, gigs, a summer job that ends)? Use what you’ll likely get this month, not your best month. Federal work-study pay is generally treated as student aid and not counted. If you’re unsure, include it. The caseworker will sort it out.',
        unit: '$ / month',
      },
      {
        id: 'unearnedIncome',
        type: 'money',
        label: 'Other regular money each month',
        why: 'Things like Social Security, SSI, unemployment, VA benefits, child support you receive, or regular cash help from family.',
        student: 'One-time gifts and occasional help usually don’t count, but regular monthly cash does. Don’t include federal student aid or loans here.',
        unit: '$ / month',
      },
      {
        id: 'nonFederalAidForLiving',
        type: 'money',
        label: 'Scholarships or grants you get as cash for living costs (not federal aid)',
        why: 'Federal aid like Pell Grants, federal work-study, and federal loans is not counted. Money used for tuition and required fees isn’t counted either. State, school, or private aid you can spend on rent or food may be.',
        student:
          'Not sure whether your aid is federal? Your financial aid award letter lists the source of each item. Divide the living-cost portion over the months it covers. If it’s a big refund check, that’s a good thing to bring to your interview.',
        unit: '$ / month',
      },
      {
        id: 'liquidAssets',
        type: 'money',
        label: 'Cash, checking, and savings, combined',
        why: 'Some states limit savings. Most states ignore your home, retirement accounts, and often one car. Many states have no savings limit at all.',
        student: 'Saved a bit for a security deposit or textbooks? That still counts as savings, but many states don’t have a limit. Don’t spend it down to qualify. Just report it honestly.',
        unit: '$',
      },
    ],
  },
  {
    id: 'costs',
    title: 'Housing and bills',
    intro: 'SNAP gives you credit for what you spend to keep a roof over your head, because rent takes a big bite for most students.',
    fields: [
      {
        id: 'housingStatus',
        type: 'radio',
        defaultValue: 'stable',
        label: 'How would you describe your housing right now?',
        why: 'Unstable housing is common among students, and SNAP has faster processing and a standard housing amount for people without a stable home. There’s no shame in any answer.',
        student:
          'Couch-surfing, living in a car, or between places counts. You don’t need to be in a shelter. Housing insecurity is one of the most common things students face, and campus basic needs offices work on it every day.',
        options: [
          { value: 'stable', label: 'I have a stable place to live' },
          { value: 'unstable', label: 'It’s unstable: I might lose it, or I move around a lot' },
          { value: 'homeless', label: 'I don’t have a stable place to live right now' },
        ],
      },
      {
        id: 'rent',
        type: 'money',
        label: 'Your monthly housing cost (your share)',
        why: 'Rent or mortgage, plus property tax and insurance if you own. A bigger share of your income going to housing means a bigger benefit.',
        student: 'Dorm? Include the housing part of your bill, not meals. Splitting rent with roommates? Enter only your share. Paying rent informally? That counts too. Be ready to explain.',
        unit: '$ / month',
      },
      {
        id: 'utilityMode',
        type: 'radio',
        defaultValue: 'included',
        label: 'Utilities',
        why: 'If you pay heating or cooling, many states use a standard allowance that’s often higher than your real bill, which helps you.',
        options: [
          { value: 'included', label: 'Utilities are included in my rent' },
          { value: 'pays_heat_cool', label: 'I pay for heating or cooling (gas, electric, oil, etc.)' },
          { value: 'pays_other_only', label: 'I pay for other utilities only (water, trash, phone, electric for lights)' },
        ],
      },
      {
        id: 'otherUtilities',
        type: 'money',
        label: 'About how much do you pay for utilities in total each month?',
        why: 'Electric, gas, water, sewer, trash, and phone. Internet no longer counts under the 2025 federal law.',
        showIf: (a) => a.utilityMode === 'pays_heat_cool' || a.utilityMode === 'pays_other_only',
        unit: '$ / month',
      },
      {
        id: 'dependentCare',
        type: 'money',
        label: 'Child or dependent care you pay for so you can work or go to school',
        why: 'These costs are deducted from your income.',
        unit: '$ / month',
      },
      {
        id: 'childSupportPaid',
        type: 'money',
        label: 'Child support you pay to someone outside your home',
        why: 'This can be deducted from your income.',
        unit: '$ / month',
      },
      {
        id: 'medical',
        type: 'money',
        label: 'Out-of-pocket medical costs for the person with a disability or age 60+',
        why: 'People who are 60+ or have a disability can deduct medical costs above $35 a month.',
        showIf: (a) => yesNo(a.hasDisabilityBenefits) || yesNo(a.otherMemberElderlyOrDisabled) || Number(a.age) >= 60,
        unit: '$ / month',
      },
    ],
  },
];

export const DEFAULTS = { householdSize: 1, exemptions: {} };

// Reads/writes a possibly-nested answer by path (e.g. "exemptions.tanf").
export const getAnswer = (answers, field) => {
  const path = (field.path || field.id).split('.');
  return path.reduce((o, k) => (o == null ? undefined : o[k]), answers);
};
export const setAnswer = (answers, field, value) => {
  const path = (field.path || field.id).split('.');
  const next = structuredClone(answers);
  let o = next;
  path.slice(0, -1).forEach((k) => (o = o[k] ??= {}));
  o[path.at(-1)] = value;
  return next;
};
