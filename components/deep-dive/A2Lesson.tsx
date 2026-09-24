'use client';

import { useActionState, useEffect, useState } from 'react';
import type { A2Section } from '../../content/deep-dive/v1/awaken/catch-yourself-being-you';

export type A2ReflectionSaveState = Readonly<{ saved: boolean }>;
type A2ReflectionAction = (state: A2ReflectionSaveState, formData: FormData) => Promise<A2ReflectionSaveState>;

const SITUATIONS = [
  'Someone misunderstands me',
  'A plan changes unexpectedly',
  'Tension rises in a conversation',
  'I feel overlooked',
] as const;

const RESPONSES = [
  { label: 'Control' },
  { label: 'Withdrawal' },
  { label: 'Fixing' },
  { label: 'Pleasing' },
  { label: 'Proving' },
  { label: 'Escaping' },
] as const;

const PRACTICE_STEPS = [
  {
    name: 'NOTICE',
    optional: false,
    text: 'When a strong response appears, pause and ask: “Have I felt this before?” and “What was similar about those situations?”',
  },
  {
    name: 'NAME',
    optional: false,
    text: 'Name only what you can observe. For example: “I noticed I became defensive when I felt misunderstood,” or “I wanted control when I felt unsure.”',
  },
  {
    name: 'ASK',
    optional: true,
    text: 'If you want to, bring what you noticed to God: “God, what do You want me to see here?” You do not have to manufacture an answer.',
  },
  {
    name: 'RECEIVE',
    optional: true,
    text: 'Stay with what becomes clear and leave what does not. Uncertainty is an acceptable outcome.',
  },
] as const;

function toggle(values: readonly string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

export function A2Lesson({ section, reflection, saveReflection }: { section: A2Section; reflection: string | null; saveReflection: A2ReflectionAction }) {
  const [saveState, formAction, pending] = useActionState(saveReflection, { saved: false });
  const [editedSinceSave, setEditedSinceSave] = useState(false);
  const [situations, setSituations] = useState<string[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [activePracticeStep, setActivePracticeStep] = useState(0);

  useEffect(() => {
    if (!pending && saveState.saved) setEditedSinceSave(false);
  }, [pending, saveState.saved]);

  return (
    <article className={`deep-dive-lesson deep-dive-lesson--a2 deep-dive-lesson--${section.id}`}>
      <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p>
      <h1>{section.title}</h1>
      {section.id === 'scripture' ? (
        <>
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
                <legend><span className="a2-pattern-map__step">01</span> Moments you recognize</legend>
                <p className="a2-pattern-map__hint">Select more than one situation that feels familiar.</p>
                {SITUATIONS.map((situation, index) => (
                  <label className="a2-checkline" key={situation}>
                    <input type="checkbox" checked={situations.includes(situation)} onChange={() => setSituations(current => toggle(current, situation))} />
                    <span><span className="a2-checkline__number" aria-hidden="true">0{index + 1}</span>{situation}</span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="a2-pattern-map__responses">
              <fieldset>
                <legend><span className="a2-pattern-map__step">02</span> Moves you may recognize</legend>
                <p className="a2-pattern-map__hint">Across those moments, what do you tend to do?</p>
                <div className="a2-response-weave">
                  {RESPONSES.map(response => (
                    <label className="a2-response-choice" key={response.label}>
                      <input type="checkbox" checked={responses.includes(response.label)} onChange={() => setResponses(current => toggle(current, response.label))} />
                      <span>{response.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <section className="a2-pattern-map__reflection" role="region" aria-label="A response that repeats" aria-live="polite">
              <span className="eyebrow">WHAT MAY BE REPEATING</span>
              {situations.length > 1 && responses.length ? (
                <p><strong>{responses.join(' · ')}</strong><span>across</span><strong>{situations.length} situations</strong></p>
              ) : (
                <p>Notice what connects these moments. You do not have to find a pattern or choose a label.</p>
              )}
              <small>This working map is only for noticing. These selections are not saved.</small>
            </section>
          </div>
        </>
      ) : section.id === 'reflection' ? (
        <>
          <div className="deep-dive-a2-prompts">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <form className="deep-dive-reflection a2-reflection" action={formAction}>
            <label htmlFor="a2-reflection">{section.prompt}</label>
            <textarea id="a2-reflection" name="body" defaultValue={reflection ?? ''} placeholder="Write only what you want to keep…" onChange={() => setEditedSinceSave(true)} />
            <div className="deep-dive-reflection__actions">
              <button className="button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save reflection'}</button>
              <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Skip for now</button>
            </div>
            <p className="status-message status-message--saved" role="status" aria-live="polite" aria-atomic="true">
              {saveState.saved && !editedSinceSave ? 'Reflection saved.' : ''}
            </p>
          </form>
        </>
      ) : section.id === 'go-deeper' ? (
        <div className="a2-sentence-path">
          {section.paragraphs.slice(0, -1).map((paragraph, index) => <p key={index}><span aria-hidden="true">0{index + 1}</span>{paragraph}</p>)}
          <p className="a2-sentence-path__closing">{section.paragraphs[section.paragraphs.length - 1]}</p>
        </div>
      ) : section.id === 'practice' ? (
        <>
          <section className="deep-dive-guidance deep-dive-guidance--practice a2-practice-intro" aria-label="Practice for the next few days">
            <p className="deep-dive-guidance__label">For the next few days</p>
            {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>
          <section className="a2-practice" aria-label="NOTICE to RECEIVE practice">
            <ol className="a2-practice__steps">
              {PRACTICE_STEPS.map((step, index) => (
                <li key={step.name}>
                  <button type="button" aria-pressed={activePracticeStep === index} aria-controls="a2-practice-panel" onClick={() => setActivePracticeStep(index)}>
                    <span className="a2-practice__number">0{index + 1}</span>
                    <span>{step.name}{step.optional ? <small>Optional</small> : null}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="a2-practice__panel" id="a2-practice-panel" role="region" aria-label={PRACTICE_STEPS[activePracticeStep].name}>
              <p className="eyebrow">{PRACTICE_STEPS[activePracticeStep].name}{PRACTICE_STEPS[activePracticeStep].optional ? ' · OPTIONAL' : ''}</p>
              <p>{PRACTICE_STEPS[activePracticeStep].text}</p>
            </div>
          </section>
        </>
      ) : section.id === 'carry-forward' ? (
        <div className="a2-carry-forward">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      ) : section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </article>
  );
}
