'use client';

import { useActionState, useEffect, useState } from 'react';
import type { A2Section } from '../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { ReviewReflection, type ReviewReflectionAction } from './ReviewReflection';

export type A2ReflectionSaveState = Readonly<{ saved: boolean; error?: string }>;
type A2ReflectionAction = (state: A2ReflectionSaveState, formData: FormData) => Promise<A2ReflectionSaveState>;

const SITUATIONS = [
  'Someone misunderstands me',
  'A plan changes unexpectedly',
  'Tension rises in a conversation',
  'Someone seems disappointed in me',
  'I feel overlooked',
] as const;

const FIRST_MOVES = ['Tension', 'Urgency', 'Discomfort', 'Fear', 'Anxiety', 'Insecurity', 'Uncertainty', 'Something else'] as const;
const RESPONSES = ['Control', 'Withdrawal', 'Fixing', 'Pleasing', 'Proving', 'Escaping', 'Something else'] as const;
const RESPONSE_EXAMPLES = [
  'Moving toward control may look like taking over, monitoring, insisting, or correcting.',
  'Moving toward withdrawal may look like going quiet, distancing, or disengaging.',
  'Moving toward fixing may look like solving immediately or managing someone else’s reaction.',
  'Moving toward pleasing may look like agreeing quickly or avoiding a needed no.',
  'Moving toward proving may look like defending, explaining harder, or working more.',
  'Moving toward escape may look like distracting yourself, leaving, or avoiding the moment.',
] as const;

const PRACTICE_STEPS = [
  {
    name: 'NOTICE',
    text: 'Something in me just changed. Pause long enough to notice it, even if that is all you can do.',
  },
  {
    name: 'NAME',
    text: 'What am I feeling, wanting, or doing? Name only what you can observe, without explaining why.',
  },
  {
    name: 'ASK',
    text: 'God, what do You want me to see here? You may leave the question open.',
  },
  {
    name: 'RECEIVE',
    text: 'Stay with what becomes clear without forcing an answer.',
  },
] as const;

function toggle(values: readonly string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

export function A2Lesson({ section, reflection, saveReflection, editReflection, review = false }: { section: A2Section; reflection: string | null; saveReflection: A2ReflectionAction; editReflection: ReviewReflectionAction; review?: boolean }) {
  const [saveState, formAction, pending] = useActionState(saveReflection, { saved: false });
  const [editedSinceSave, setEditedSinceSave] = useState(false);
  const [body, setBody] = useState(reflection ?? '');
  const [situations, setSituations] = useState<string[]>([]);
  const [moves, setMoves] = useState<Record<string, { internal: string; response: string }>>({});
  const [activePracticeStep, setActivePracticeStep] = useState(0);
  const [examplesOpen, setExamplesOpen] = useState(false);

  const repeated = RESPONSES.map(response => ({ response, moments: situations.filter(situation => moves[situation]?.response === response) })).filter(group => group.moments.length > 1);
  const firstMoves = [...new Set(situations.map(situation => moves[situation]?.internal).filter(Boolean))];
  const updateMove = (situation: string, field: 'internal' | 'response', value: string) => {
    setMoves(current => ({ ...current, [situation]: { internal: current[situation]?.internal ?? '', response: current[situation]?.response ?? '', [field]: value } }));
  };

  useEffect(() => {
    if (!pending && saveState.saved) setEditedSinceSave(false);
  }, [pending, saveState.saved]);

  return (
    <article className={`deep-dive-lesson deep-dive-lesson--a2 deep-dive-lesson--${section.id}`}>
      <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p>
      <h1>{section.title}</h1>
      {section.id === 'entry' ? (
        <div className="a2-opening">
          <div className="a2-opening__situations">{section.paragraphs.slice(0, -1).map((paragraph, index) => <p key={paragraph}><span aria-hidden="true">0{index + 1}</span>{paragraph}</p>)}</div>
          <p className="a2-opening__turn">{section.paragraphs[section.paragraphs.length - 1]}</p>
        </div>
      ) : section.id === 'scripture' ? (
        <>
          <p className="a2-mirror-intro">A mirror does not create what is there. It helps you see what is already present.</p>
          <figure className="deep-dive-scripture a2-mirror" aria-label="James 1:23–24 Scripture passage">
            <span className="a2-mirror__label" aria-hidden="true">THE MIRROR</span>
            <blockquote><p>{section.paragraphs[0]}</p></blockquote>
            <figcaption><cite>James 1:23–24 <span aria-hidden="true">·</span> World English Bible</cite></figcaption>
          </figure>
          {section.paragraphs.slice(1).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </>
      ) : section.id === 'patterns' ? (
        <>
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <div className="a2-pattern-map">
            <div className="a2-pattern-map__situations">
              <fieldset>
                <legend><span className="a2-pattern-map__step">01</span> Situations you recognize</legend>
                <p className="a2-pattern-map__hint">Select the moments you want to compare.</p>
                {SITUATIONS.map((situation, index) => (
                  <label className="a2-checkline" key={situation}>
                    <input type="checkbox" checked={situations.includes(situation)} onChange={() => setSituations(current => toggle(current, situation))} />
                    <span><span className="a2-checkline__number" aria-hidden="true">0{index + 1}</span>{situation}</span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="a2-pattern-map__responses">
              <h2><span className="a2-pattern-map__step">02</span> What happened in each moment?</h2>
              <p className="a2-pattern-map__hint">You choose what you noticed. Leaving a field blank is fine.</p>
              {situations.length ? situations.map(situation => (
                <div className="a2-mapped-moment" key={situation}>
                  <h3>{situation}</h3>
                  <div className="a2-mapped-moment__choices">
                    <label>First internal move for {situation}
                      <select aria-label={`First internal move for ${situation}`} value={moves[situation]?.internal ?? ''} onChange={event => updateMove(situation, 'internal', event.target.value)}>
                        <option value="">Choose only if noticed</option>
                        {FIRST_MOVES.map(move => <option key={move}>{move}</option>)}
                      </select>
                    </label>
                    <label>Typical response for {situation}
                      <select aria-label={`Typical response for ${situation}`} value={moves[situation]?.response ?? ''} onChange={event => updateMove(situation, 'response', event.target.value)}>
                        <option value="">Choose only if noticed</option>
                        {RESPONSES.map(response => <option key={response}>{response}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )) : <p className="a2-map-empty">Select a situation to begin connecting what happened inside with how you responded.</p>}
            </div>
            <section className="a2-pattern-map__reflection" role="region" aria-label="A response that repeats" aria-live="polite">
              <span className="eyebrow">WHAT MAY BE REPEATING</span>
              {repeated.length ? (
                <p><strong>{repeated.map(group => group.response).join(' · ')}</strong><span>across</span><strong>{repeated[0].moments.length} situations</strong>{firstMoves.length ? <span>First moves you named: {firstMoves.join(' · ')}</span> : null}</p>
              ) : (
                <p>Notice what connects these moments. You do not have to find a repeated response or choose a label.</p>
              )}
              <small>This working map is only for noticing. These selections are not saved.</small>
            </section>
          </div>
          <div className="deep-dive-reveal a2-response-disclosure">
            <button type="button" aria-expanded={examplesOpen} onClick={() => setExamplesOpen(value => !value)}><span>What can these responses look like?</span><span className="deep-dive-reveal__icon" aria-hidden="true">⌄</span></button>
            {examplesOpen ? <div className="a2-response-examples">{RESPONSE_EXAMPLES.map(example => <p key={example}>{example}</p>)}</div> : null}
          </div>
          <section className="a2-pattern-reveal"><h2>A pattern is not a label for who you are.</h2><p>It is something you have begun to notice yourself doing. One moment may seem random. Repeated moments begin to reveal a pattern. You can recognize it without explaining where it came from or trying to fix it today.</p></section>
        </>
      ) : section.id === 'reflection' ? (
        <>
          <div className="deep-dive-a2-prompts">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          {review ? <ReviewReflection id="a2-reflection" label={section.prompt ?? 'Your reflection'} reflection={reflection} action={editReflection} /> : <form className="deep-dive-reflection a2-reflection" action={formAction}>
            <label htmlFor="a2-reflection">{section.prompt}</label>
            <textarea id="a2-reflection" name="body" value={body} placeholder="Write only what you want to keep…" onChange={event => { setBody(event.target.value); setEditedSinceSave(true); }} />
            <div className="deep-dive-reflection__actions">
              <button className="button" type="submit" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
              <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without writing</button>
            </div>
            <p className="status-message status-message--saved" role="status" aria-live="polite" aria-atomic="true">
              {saveState.saved && !editedSinceSave ? 'Reflection saved.' : ''}
            </p>
            {saveState.error ? <p className="field__error" role="alert">{saveState.error}</p> : null}
          </form>}
        </>
      ) : section.id === 'go-deeper' ? (
        <>
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <section className="a2-practice" aria-label="NOTICE to RECEIVE practice">
            <ol className="a2-practice__steps">
              {PRACTICE_STEPS.map((step, index) => (
                <li key={step.name}>
                  <button type="button" aria-label={step.name} aria-pressed={activePracticeStep === index} aria-controls="a2-practice-panel" onClick={() => setActivePracticeStep(index)}>
                    <span className="a2-practice__number">0{index + 1}</span>
                    <span>{step.name}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="a2-practice__panel" id="a2-practice-panel" role="region" aria-label={PRACTICE_STEPS[activePracticeStep].name}>
              <p className="eyebrow">{PRACTICE_STEPS[activePracticeStep].name}</p>
              <p>{PRACTICE_STEPS[activePracticeStep].text}</p>
            </div>
          </section>
        </>
      ) : section.id === 'practice' ? (
        <section className="deep-dive-guidance deep-dive-guidance--practice a2-practice-intro" aria-label="Practice for the next few days">
          <p className="deep-dive-guidance__label">For the next few days</p>
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </section>
      ) : section.id === 'carry-forward' ? (
        <div className="a2-carry-forward">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      ) : section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </article>
  );
}
