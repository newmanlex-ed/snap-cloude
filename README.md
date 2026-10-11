# Student Food Benefits Check (SNAP screener for college students)

A private, plain-language SNAP eligibility screener built around the federal
student rule (7 CFR 273.5) and state policy variables. It explains **why every
question is asked**, how **student-specific circumstances** change answers,
shows an **estimated monthly benefit with step-by-step rationale**, and links
the student's **state application**.

## Run it
```
npm install
npm run dev      # API :3001 + web :5173
npm test         # engine tests (hand-computed expected values)
npm run build && npm start   # production: API serves the built client
npm run audit:states         # lists every state value still needing verification
```

## Design principles (Poverty-Informed Practice)
- **Private by design.** The API is a stateless calculator: no database, no
  request-body logging, no cookies/localStorage/analytics. Keep it that way.
- **Dignity and entitlement framing.** Benefits are described as support students
  are likely entitled to; barriers are named as structural (aid gaps, uneven
  hours, housing costs), not personal.
- **Nothing required but state and age.** "Not sure" and "prefer not to say" never block.
- **Never a hard "no".** Over-limit or blocked results explain what could change
  and still encourage applying; only the state decides.
- **Transparent math.** Every line of the calculation has a plain-language reason.
- Content (questions, why-text, student notes) lives in `client/src/questions.js`
  for review and translation by non-engineers.

## What's modeled
Federal FY2027 tables (`server/src/engine/federal.js`); student exemptions
(`students.js`); gross/net/asset tests, deductions, shelter cap, SUA, homeless
deduction, minimum benefit, expedited screen, BBCE (`screen.js`); 2025 OBBBA
changes (noncitizen eligibility, internet costs excluded).

## MUST do before public launch
1. **Verify federal figures** against the USDA FY2027 COLA memo (fns.usda.gov was
   unreachable when written). Known conflict: 4-person standard deduction $229 vs $231.
2. **Audit state data** (`npm run audit:states`). Only NY and PA BBCE values are
   from official agency sources; CT/CA/TX utility allowances are FY2026, the rest
   unknown. Unverified values only ever produce "possible", never "likely".
3. **Live-check every application URL.**
4. Have a benefits attorney/navigator review wording, especially the immigration
   language, and confirm current public-charge and data-sharing guidance.
5. Refresh all figures every October 1.

## Known simplifications
Ineligible-noncitizen household members are not prorated; countable-resource
detail (vehicles, etc.) is not modeled; state options on child-support and
income-averaging are assumed; Alaska/Hawaii use different federal tables.
