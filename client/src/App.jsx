import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STEPS, DEFAULTS, getAnswer, setAnswer } from './questions.js';
import Results from './Results.jsx';

// Privacy: answers live only in React state. Nothing is written to localStorage,
// cookies, or analytics. Closing the tab erases everything.

function Field({ field, answers, onChange, states }) {
  const value = getAnswer(answers, field);
  const id = `f-${field.id}`;
  const whyId = `${id}-why`;
  const set = (v) => onChange(setAnswer(answers, field, v));

  const control = (() => {
    switch (field.type) {
      case 'state':
        return (
          <select id={id} value={value ?? ''} onChange={(e) => onChange({ ...answers, state: e.target.value, region: undefined })} aria-describedby={whyId}>
            <option value="">Choose your state…</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        );
      case 'region': {
        const regions = states.find((s) => s.code === answers.state)?.regions || [];
        return (
          <select id={id} value={value ?? ''} onChange={(e) => set(e.target.value)} aria-describedby={whyId}>
            <option value="">Choose…</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        );
      }
      case 'select':
        return (
          <select id={id} value={value ?? ''} onChange={(e) => set(e.target.value)} aria-describedby={whyId}>
            <option value="">Choose one, or skip…</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'number':
      case 'money':
        return (
          <div className="input-with-unit">
            {field.type === 'money' && <span aria-hidden="true">$</span>}
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={field.min ?? 0}
              max={field.max}
              step={field.step ?? (field.type === 'money' ? 1 : 1)}
              value={value ?? ''}
              placeholder={field.type === 'money' ? '0' : ''}
              onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))}
              aria-describedby={whyId}
            />
            {field.unit && field.type !== 'money' && <span className="unit">{field.unit}</span>}
            {field.type === 'money' && field.unit && <span className="unit">{field.unit.replace('$ ', '')}</span>}
          </div>
        );
      default:
        return null;
    }
  })();

  if (field.type === 'checkbox') {
    return (
      <div className="field">
        <label className="check">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} aria-describedby={field.why ? whyId : undefined} />
          <span>{field.label}</span>
        </label>
        <Why field={field} id={whyId} />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset className="field" aria-describedby={whyId}>
        <legend>{field.label}</legend>
        {field.options.map((o) => (
          <label key={o.value} className="check">
            <input type="radio" name={id} value={o.value} checked={(value ?? field.defaultValue) === o.value} onChange={() => set(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
        <Why field={field} id={whyId} />
      </fieldset>
    );
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        {field.label}
        {field.required && <span className="req"> (needed)</span>}
      </label>
      {control}
      <Why field={field} id={whyId} />
    </div>
  );
}

function Why({ field, id }) {
  if (!field.why && !field.student) return null;
  return (
    <div className="why" id={id}>
      {field.why && (
        <p>
          <strong>Why we ask: </strong>
          {field.why}
        </p>
      )}
      {field.student && (
        <details>
          <summary>If your situation is a little different</summary>
          <p>{field.student}</p>
        </details>
      )}
    </div>
  );
}

function Welcome({ onStart }) {
  return (
    <section className="card welcome">
      <h1>Find out what food support you may be eligible for</h1>
      <p className="lede">
        SNAP is a nutrition benefit that helps people buy groceries. Millions of working people, parents, and college students use it. Students are
        among the most likely to qualify and the least likely to apply: a federal report found more than half of students who were likely eligible
        weren’t getting it (U.S. GAO, 2018).
      </p>
      <p>
        In about 5–8 minutes, we’ll check the student rules, estimate your monthly amount, and show our math. Along the way, we explain why we ask
        each question.
      </p>
      <ul className="promises">
        <li>
          <strong>Private.</strong> We don’t save, track, or share your answers. Close this tab and they’re gone.
        </li>
        <li>
          <strong>No wrong answers.</strong> You can skip anything, estimate, or say you’re not sure.
        </li>
        <li>
          <strong>Not an application.</strong> This is a quick check. Your state makes the final decision, and you’ll get a link to apply at the end.
        </li>
        <li>
          <strong>Your situation counts.</strong> Irregular hours, financial aid, roommates, family support, unstable housing: these are normal for students,
          and we ask about them directly.
        </li>
      </ul>
      <button className="primary" onClick={onStart}>
        Let’s begin
      </button>
    </section>
  );
}

export default function App() {
  const [stage, setStage] = useState('welcome'); // welcome | form | results
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState(DEFAULTS);
  const [states, setStates] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const headingRef = useRef(null);

  useEffect(() => {
    fetch('/api/states')
      .then((r) => r.json())
      .then((d) => setStates(d.states))
      .catch(() => setError('We couldn’t load the list of states. Please refresh the page.'));
  }, []);

  const visibleSteps = useMemo(() => STEPS.filter((s) => !s.showIf || s.showIf(answers)), [answers]);
  const step = visibleSteps[Math.min(stepIdx, visibleSteps.length - 1)];
  const isLast = stepIdx >= visibleSteps.length - 1;

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [stage, stepIdx]);

  const missingRequired = step?.fields.filter((f) => f.required && (!f.showIf || f.showIf(answers)) && (getAnswer(answers, f) ?? '') === '');

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/screen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data);
      setStage('results');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const restart = () => {
    setAnswers(DEFAULTS);
    setResult(null);
    setStepIdx(0);
    setStage('welcome');
  };

  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <span className="brand">Student Food Benefits Check</span>
        <span className="privacy-pill" title="Your answers are never saved">
          🔒 Nothing is saved
        </span>
      </header>
      <main id="main" tabIndex={-1}>
        {stage === 'welcome' && (
          <>
            <h1 className="sr-only" ref={headingRef} tabIndex={-1}>
              Welcome
            </h1>
            <Welcome onStart={() => setStage('form')} />
          </>
        )}

        {stage === 'form' && step && (
          <section className="card">
            <nav aria-label="Progress" className="progress">
              <div className="bar" role="progressbar" aria-valuemin={1} aria-valuemax={visibleSteps.length} aria-valuenow={stepIdx + 1} aria-label={`Step ${stepIdx + 1} of ${visibleSteps.length}`}>
                <span style={{ width: `${((stepIdx + 1) / visibleSteps.length) * 100}%` }} />
              </div>
              <p>
                Step {stepIdx + 1} of {visibleSteps.length}: {step.title}
              </p>
            </nav>
            <h2 ref={headingRef} tabIndex={-1}>
              {step.title}
            </h2>
            <p className="lede">{step.intro}</p>
            {step.fields
              .filter((f) => !f.showIf || f.showIf(answers))
              .map((f) => (
                <Field key={f.id} field={f} answers={answers} onChange={setAnswers} states={states} />
              ))}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {missingRequired?.length > 0 && <p className="hint">Needed to continue: {missingRequired.map((f) => f.label.replace(/\?$/, '')).join('; ')}</p>}
            <div className="actions">
              <button className="secondary" onClick={() => (stepIdx === 0 ? setStage('welcome') : setStepIdx(stepIdx - 1))}>
                Back
              </button>
              {isLast ? (
                <button className="primary" disabled={loading || missingRequired?.length > 0} onClick={submit}>
                  {loading ? 'Calculating…' : 'See my results'}
                </button>
              ) : (
                <button className="primary" disabled={missingRequired?.length > 0} onClick={() => setStepIdx(stepIdx + 1)}>
                  Continue
                </button>
              )}
            </div>
          </section>
        )}

        {stage === 'results' && result && (
          <Results result={result} answers={answers} headingRef={headingRef} onEdit={() => { setStage('form'); setStepIdx(0); }} onRestart={restart} />
        )}
      </main>
      <footer className="site-footer">
        <p>
          This tool gives an estimate, not a decision, and is not legal advice. Federal figures are {result?.meta?.fiscalYear || 'FY2027'} amounts (effective Oct 1, 2026). Only your
          state agency can approve benefits.
        </p>
      </footer>
    </>
  );
}
