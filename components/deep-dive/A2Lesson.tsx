'use client';

import { useActionState, useEffect, useState } from 'react';
import type { A2Section } from '../../content/deep-dive/v1/awaken/catch-yourself-being-you';

export type A2ReflectionSaveState = Readonly<{ saved: boolean }>;
type A2ReflectionAction = (state: A2ReflectionSaveState, formData: FormData) => Promise<A2ReflectionSaveState>;

export function A2Lesson({ section, reflection, saveReflection }: { section: A2Section; reflection: string | null; saveReflection: A2ReflectionAction }) {
  const [saveState, formAction, pending] = useActionState(saveReflection, { saved: false });
  const [editedSinceSave, setEditedSinceSave] = useState(false);

  useEffect(() => {
    if (!pending && saveState.saved) setEditedSinceSave(false);
  }, [pending, saveState.saved]);

  return (
    <article className={`deep-dive-lesson deep-dive-lesson--a2 deep-dive-lesson--${section.id}`}>
      <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p>
      <h1>{section.title}</h1>
      {section.id === 'scripture' ? (
        <figure className="deep-dive-scripture" aria-label="James 1:23–24 Scripture passage">
          <blockquote><p>{section.paragraphs[0]}</p></blockquote>
          <figcaption><cite>James 1:23–24 <span aria-hidden="true">·</span> World English Bible</cite></figcaption>
          {section.paragraphs.slice(1).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </figure>
      ) : section.id === 'practice' || section.id === 'carry-forward' ? (
        <section className={`deep-dive-guidance deep-dive-guidance--${section.id}`} aria-label={section.id === 'practice' ? 'Practice for the next few days' : 'Carry forward'}>
          {section.id === 'practice' ? <p className="deep-dive-guidance__label">For the next few days</p> : null}
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </section>
      ) : section.id === 'go-deeper' ? (
        <div className="deep-dive-a2-stems" aria-label="Sentence completion prompts">
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      ) : section.id === 'reflection' ? (
        <>
          <div className="deep-dive-a2-prompts">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          <form className="deep-dive-reflection" action={formAction}>
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
      ) : section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </article>
  );
}
