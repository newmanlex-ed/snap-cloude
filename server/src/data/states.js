// State SNAP policy variables.
//
// HONESTY NOTE: Live checks against USDA/state sites were blocked while this
// was written. Every field carries a `confidence`:
//   'verified'   seen on an official state-agency page (FY2026 values)
//   'reported'   corroborated by at least one search result, not primary
//   'unverified' recalled from background knowledge. Needs a human check.
// `null` means "we don't know" (NOT "the state has no such policy"). The engine
// then falls back to federal rules and tells the student the state may be more
// generous. Run `npm run audit:states` to list everything still needing review.
//
// Fields
//   program        local name of SNAP, when it differs
//   apply          { url, kind: 'portal' | 'agency', confidence }
//   bbce           broad-based categorical eligibility (higher gross limit,
//                  often no asset test), or null if unknown
//     grossPct            % of poverty gross limit
//     grossPctAlt         { pct, when } optional alternate (New York)
//     assetTest           'none' | 'federal' | <dollar limit>
//   sua            standard utility allowance for households that pay
//                  heating/cooling, or null if unknown. `regions` optional.

export const FNS_STATE_DIRECTORY = 'https://www.fns.usda.gov/snap/state-directory';
export const STATES_AS_OF = '2026-10-11';

const p = (url, confidence = 'unverified') => ({ url, kind: 'portal', confidence });
const a = (url, confidence = 'unverified') => ({ url, kind: 'agency', confidence });
const bb = (grossPct, assetTest, confidence = 'unverified', extra = {}) => ({
  grossPct,
  assetTest,
  confidence,
  ...extra,
});

export const STATES = [
  { code: 'AL', name: 'Alabama', apply: a('https://mydhr.alabama.gov'), bbce: null, sua: null },
  { code: 'AK', name: 'Alaska', apply: a('https://health.alaska.gov/dpa/Pages/SNAP'), bbce: null, sua: null, note: 'Alaska uses higher benefit levels than the numbers in this tool. Your estimate may be low.' },
  { code: 'AZ', name: 'Arizona', apply: p('https://www.healthearizonaplus.gov'), bbce: bb(185, 'none', 'unverified', { note: 'Sources disagreed on 185% vs 200%; the lower is used.' }), sua: null },
  { code: 'AR', name: 'Arkansas', apply: p('https://access.arkansas.gov'), bbce: null, sua: null },
  { code: 'CA', name: 'California', program: 'CalFresh', apply: p('https://benefitscal.com', 'reported'), bbce: bb(200, 'none', 'reported'), sua: { amount: 663, fy: 2026, confidence: 'reported', source: 'LA County DPSS CalFresh COLA notice' } },
  { code: 'CO', name: 'Colorado', apply: p('https://peak.my.site.com/peak/s/'), bbce: bb(200, 'none'), sua: null },
  { code: 'CT', name: 'Connecticut', apply: p('https://connect.ct.gov'), bbce: bb(200, 'none'), sua: { amount: 976, fy: 2026, confidence: 'reported', source: 'CT DSS tables, effective 10/01/2025' } },
  { code: 'DE', name: 'Delaware', apply: p('https://assist.dhss.delaware.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'DC', name: 'District of Columbia', apply: p('https://dcbenefits.dhs.dc.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'FL', name: 'Florida', apply: a('https://www.myflfamilies.com/services/public-assistance/snap', 'reported'), bbce: bb(200, 'none', 'reported'), sua: null },
  { code: 'GA', name: 'Georgia', apply: p('https://gateway.ga.gov'), bbce: null, sua: null },
  { code: 'HI', name: 'Hawaii', apply: a('https://humanservices.hawaii.gov/bessd/snap'), bbce: bb(200, 'none'), sua: null, note: 'Hawaii uses its own benefit levels, so your estimate may differ.' },
  { code: 'ID', name: 'Idaho', apply: p('https://idalink.idaho.gov'), bbce: null, sua: null },
  { code: 'IL', name: 'Illinois', apply: p('https://abe.illinois.gov'), bbce: bb(165, 'none', 'reported'), sua: null },
  { code: 'IN', name: 'Indiana', apply: p('https://fssabenefits.in.gov'), bbce: null, sua: null },
  { code: 'IA', name: 'Iowa', apply: a('https://hhs.iowa.gov'), bbce: bb(160, 'none', 'reported'), sua: null },
  { code: 'KS', name: 'Kansas', apply: a('https://www.dcf.ks.gov'), bbce: null, sua: null },
  { code: 'KY', name: 'Kentucky', apply: p('https://kynect.ky.gov'), bbce: null, sua: null },
  { code: 'LA', name: 'Louisiana', apply: p('https://cafe-cp.dcfs.la.gov'), bbce: null, sua: null },
  { code: 'ME', name: 'Maine', apply: p('https://www.maine.gov/benefits'), bbce: bb(200, 'none'), sua: null },
  { code: 'MD', name: 'Maryland', apply: p('https://mymdthink.maryland.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'MA', name: 'Massachusetts', apply: p('https://dtaconnect.eohhs.mass.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'MI', name: 'Michigan', program: 'Food Assistance Program', apply: p('https://newmibridges.michigan.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'MN', name: 'Minnesota', apply: p('https://applymn.dhs.mn.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'MS', name: 'Mississippi', apply: a('https://www.mdhs.ms.gov'), bbce: null, sua: null },
  { code: 'MO', name: 'Missouri', apply: p('https://mydss.mo.gov'), bbce: null, sua: null },
  { code: 'MT', name: 'Montana', apply: p('https://apply.mt.gov'), bbce: null, sua: null },
  { code: 'NE', name: 'Nebraska', apply: a('https://dhhs.ne.gov/Pages/ACCESSNebraska.aspx'), bbce: null, sua: null },
  { code: 'NV', name: 'Nevada', apply: p('https://accessnevada.dwss.nv.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'NH', name: 'New Hampshire', apply: p('https://nheasy.nh.gov'), bbce: null, sua: null },
  { code: 'NJ', name: 'New Jersey', apply: p('https://njhelps.org'), bbce: bb(185, 'none'), sua: null },
  { code: 'NM', name: 'New Mexico', apply: p('https://www.yes.state.nm.us'), bbce: bb(200, 'none'), sua: null },
  {
    code: 'NY', name: 'New York', apply: p('https://mybenefits.ny.gov', 'reported'),
    bbce: bb(150, 'none', 'verified', { grossPctAlt: { pct: 200, when: 'elderly_disabled_or_dependent_care' }, source: 'NY OTDA 25-DC-059' }),
    sua: { amount: 877, fy: 2026, confidence: 'verified', source: 'NY OTDA 25-DC-059',
      regions: [
        { id: 'nyc', label: 'New York City', amount: 1062 },
        { id: 'li', label: 'Nassau or Suffolk County', amount: 988 },
        { id: 'rest', label: 'Elsewhere in New York', amount: 877 },
      ] },
  },
  { code: 'NC', name: 'North Carolina', apply: p('https://epass.nc.gov'), bbce: null, sua: null },
  { code: 'ND', name: 'North Dakota', apply: p('https://apps.nd.gov/dhs/self-service'), bbce: null, sua: null },
  { code: 'OH', name: 'Ohio', apply: p('https://benefits.ohio.gov'), bbce: null, sua: null },
  { code: 'OK', name: 'Oklahoma', apply: a('https://oklahoma.gov/okdhs'), bbce: null, sua: null },
  { code: 'OR', name: 'Oregon', apply: p('https://one.oregon.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'PA', name: 'Pennsylvania', apply: p('https://www.compass.state.pa.us', 'reported'), bbce: bb(200, 'none', 'verified', { source: 'PA DHS SNAP income limits' }), sua: null },
  { code: 'RI', name: 'Rhode Island', apply: p('https://healthyrhode.ri.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'SC', name: 'South Carolina', apply: a('https://dss.sc.gov'), bbce: null, sua: null },
  { code: 'SD', name: 'South Dakota', apply: a('https://dss.sd.gov/economicassistance/snap'), bbce: null, sua: null },
  { code: 'TN', name: 'Tennessee', apply: a('https://www.tn.gov/humanservices/for-families/supplemental-nutrition-assistance-program-snap.html'), bbce: null, sua: null },
  { code: 'TX', name: 'Texas', apply: p('https://www.yourtexasbenefits.com'), bbce: bb(165, 5000), sua: { amount: 445, fy: 2026, confidence: 'reported', source: 'Texas Works Handbook C-120, eff. 10/01/2025' } },
  { code: 'UT', name: 'Utah', apply: p('https://jobs.utah.gov/mycase'), bbce: null, sua: null },
  { code: 'VT', name: 'Vermont', program: '3SquaresVT', apply: a('https://dcf.vermont.gov/benefits/3SquaresVT'), bbce: bb(185, 'none'), sua: null },
  { code: 'VA', name: 'Virginia', apply: p('https://commonhelp.virginia.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'WA', name: 'Washington', program: 'Basic Food', apply: p('https://www.washingtonconnection.org'), bbce: bb(200, 'none', 'reported'), sua: null },
  { code: 'WV', name: 'West Virginia', apply: p('https://www.wvpath.wv.gov'), bbce: null, sua: null },
  { code: 'WI', name: 'Wisconsin', program: 'FoodShare', apply: p('https://access.wisconsin.gov'), bbce: bb(200, 'none'), sua: null },
  { code: 'WY', name: 'Wyoming', apply: a('https://dfsweb.wyo.gov'), bbce: null, sua: null },
];

const byCode = new Map(STATES.map((s) => [s.code, s]));
export const getState = (code) => byCode.get(String(code || '').toUpperCase());
export const programName = (s) => s.program || 'SNAP';
