import React from 'react';

const money = (n) => `$${Math.abs(Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

const TONE = {
  likely_eligible: 'good',
  possibly_eligible: 'good',
  student_rule_open: 'open',
  status_limits: 'open',
  likely_over_limit: 'open',
};

function Rationale({ rows }) {
  return (
    <section aria-labelledby="how-h" className="block">
      <h3 id="how-h">How we got this number</h3>
      <p className="muted">SNAP follows a set formula. Here it is step by step, with the reason for each line, so you can check it against your own situation.</p>
      <table className="math">
        <caption className="sr-only">Step-by-step benefit calculation</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.total ? 'total' : r.subtotal ? 'subtotal' : ''}>
              <th scope="row">
                {r.label}
                {r.why && <small>{r.why}</small>}
              </th>
              <td>
                {r.value ?? (r.amount < 0 ? `− ${money(r.amount)}` : money(r.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function Results({ result, answers, headingRef, onEdit, onRestart }) {
  const { status, state, student, estimate } = result;
  const tone = TONE[status] || 'open';
  const canApply = ['likely_eligible', 'possibly_eligible', 'likely_over_limit', 'student_rule_open', 'status_limits'].includes(status);

  return (
    <article className="results" aria-live="polite">
      <section className={`card hero ${tone}`}>
        <h2 ref={headingRef} tabIndex={-1}>
          {result.headline}
        </h2>
        <p className="lede">{result.body}</p>
        {estimate && (
          <div className="estimate" aria-label="Estimated monthly benefit">
            <span className="amount">{money(estimate.monthly)}</span>
            <span className="per">estimated per month{estimate.isMinimum ? ' (the minimum for 1–2 person households)' : ''}</span>
            <p className="muted">
              This is an estimate based on what you told us. Your state calculates the real amount, and it could be higher or lower. You’d typically get it on an EBT card that works like a debit card at grocery stores and many farmers markets.
            </p>
          </div>
        )}
        {result.expedited && (
          <p className="callout">
            <strong>You may qualify for faster help.</strong> People with very little income or savings, or whose housing costs are more than their money on hand, can get benefits within 7 days. Ask for “expedited SNAP” when you apply.
          </p>
        )}
      </section>

      {student.applies && (
        <section className="card block">
          <h3>Your student rules</h3>
          <p>{student.summary}</p>
          {student.pathways.length > 0 && (
            <>
              <h4>What you qualify under</h4>
              <ul className="checks">
                {student.pathways.map((p) => (
                  <li key={p.id}>
                    <strong>{p.label}.</strong> {p.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!student.passes && student.nearMisses.length > 0 && (
            <>
              <h4>Close, and worth a conversation</h4>
              <ul>
                {student.nearMisses.map((p) => (
                  <li key={p.id}>
                    <strong>{p.label}.</strong> {p.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!student.passes && student.suggestions?.length > 0 && (
            <>
              <h4>Doors that could open</h4>
              <ul>
                {student.suggestions.map((p) => (
                  <li key={p.id}>
                    <strong>{p.label}.</strong> {p.detail}
                  </li>
                ))}
              </ul>
              <p className="muted">Your state’s rules can be broader than the federal baseline, and caseworkers can see details we can’t. Applying is still allowed, and they’ll tell you.</p>
            </>
          )}
        </section>
      )}

      {result.rationale && <div className="card"><Rationale rows={result.rationale} /></div>}

      {result.notes.length > 0 && (
        <section className="card block">
          <h3>Things to keep in mind</h3>
          <ul>
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {canApply && (
        <section className="card block next">
          <h3>Next steps</h3>
          <ol>
            {result.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="apply">
            <a className="primary link-button" href={state.applyUrl} target="_blank" rel="noopener noreferrer">
              {state.applyKind === 'portal' ? `Apply for ${state.program} in ${state.name}` : `Go to ${state.name}’s ${state.program} page`}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="muted">
              {state.applyConfidence === 'verified'
                ? ''
                : `We can’t guarantee this link is current. If it doesn’t work, `}
              {state.applyConfidence !== 'verified' && (
                <a href={state.directoryUrl} target="_blank" rel="noopener noreferrer">
                  find your state’s official SNAP office in the USDA directory
                </a>
              )}
              {state.applyConfidence !== 'verified' && '.'}
            </p>
            <p className="muted">
              Applying is free. You don’t need an exact amount or every document to start. The date you apply is usually when benefits can begin, so applying sooner can mean more.
            </p>
          </div>
        </section>
      )}

      <section className="card block">
        <h3>More support</h3>
        <ul>
          <li>Your campus basic needs office, financial aid office, or dean of students can often help with applications, emergency aid, and food pantries.</li>
          <li>
            <a href="https://hope4college.com" target="_blank" rel="noopener noreferrer">
              The Hope Center
            </a>{' '}
            researches and shares resources on student basic needs.
          </li>
          <li>Call 2-1-1 for local food, housing, and utility help.</li>
        </ul>
      </section>

      <div className="actions no-print">
        <button className="secondary" onClick={onEdit}>
          Change my answers
        </button>
        <button className="secondary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button className="secondary" onClick={onRestart}>
          Start over &amp; clear everything
        </button>
      </div>
    </article>
  );
}
