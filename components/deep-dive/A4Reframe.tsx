'use client';

import { useState, useTransition } from 'react';
const A4_NEUTRAL_REFRAME = 'I learned to respond this way in some situations, but this is not the whole truth of who I am.';

export function A4Reframe({ generate }: { generate: (statement: string) => Promise<string> }) {
  const [statement, setStatement] = useState('');
  const [original, setOriginal] = useState('');
  const [proposal, setProposal] = useState('');
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(false);
  return <section className="a4-reframe" aria-label="Formation reframe">
    <label htmlFor="a4-statement">A pattern you recognize<input id="a4-statement" value={statement} onChange={event => setStatement(event.target.value)} placeholder="For example: I like to be in control" maxLength={500} /></label>
    <button className="button" type="button" disabled={!statement.trim() || pending} onClick={() => {
      const current = statement.trim();
      setOriginal(current); setRequested(true); setProposal('');
      startTransition(async () => {
        try { setProposal(await generate(current)); }
        catch { setProposal(A4_NEUTRAL_REFRAME); }
      });
    }}>{pending ? 'Finding a way to say it…' : 'See another way to say it'}</button>
    {requested && proposal ? <div role="region" aria-label="Your working reframe">
      <p><strong>Your words:</strong> {original}</p>
      <label htmlFor="a4-proposal">A different way to say it<textarea id="a4-proposal" rows={3} value={proposal} onChange={event => setProposal(event.target.value)} /></label>
      <small>Notice the difference between naming a pattern and naming yourself. This is just for reflection and is not saved.</small>
    </div> : null}
  </section>;
}
