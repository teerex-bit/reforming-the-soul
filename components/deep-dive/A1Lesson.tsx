'use client';
import { useActionState, useEffect, useState } from 'react';
import type { A1Section } from '../../content/deep-dive/v1/awaken/pay-attention';

export type A1ReflectionSaveState = Readonly<{ saved: boolean; error?: string }>;
type A1ReflectionAction = (state: A1ReflectionSaveState, formData: FormData) => Promise<A1ReflectionSaveState>;

export function A1Lesson({ section, index, total, reflection, saveReflection, review = false }: { section: A1Section; index: number; total: number; reflection: string | null; saveReflection: A1ReflectionAction; review?: boolean }) {
  const [open, setOpen] = useState(false);
  const [saveState, formAction, pending] = useActionState(saveReflection, { saved: false });
  const [editedSinceSave, setEditedSinceSave] = useState(false);
  const [body, setBody] = useState(reflection ?? '');

  useEffect(() => {
    if (!pending && saveState.saved) setEditedSinceSave(false);
  }, [pending, saveState.saved]);

  const renderParagraphs = (className?: string) => section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className={className}>{paragraph}</p>);

  return (
    <article className={`deep-dive-lesson deep-dive-lesson--a1 deep-dive-lesson--${section.id}`}>
      <p className="eyebrow deep-dive-section-label">{section.eyebrow}</p>
      {section.id !== 'moment' ? <h1>{section.title}</h1> : null}
      {section.id === 'moment' ? (
        <div className="a1-opening-moment">
          <div className="a1-message" role="group" aria-label="A message on your phone">
            <span className="a1-message__sender">A message</span>
            <h1>{section.title}</h1>
          </div>
          <div className="a1-pause">
            <span className="a1-pause__mark" aria-hidden="true">01</span>
            <p>{section.paragraphs[0]}</p>
            <p>{section.paragraphs[1].split(': ')[0]}:</p>
            <div className="a1-response-lines">{section.paragraphs[1].split(': ')[1].split(/(?<=\.)\s+/).map(line => <p key={line}>{line}</p>)}</div>
          </div>
        </div>
      ) : section.id === 'outside-inside' ? (
        <>
          <div className="a1-comparison" aria-label="The outside and inside of a moment">
            <section className="a1-comparison__side a1-comparison__side--outside" role="group" aria-label="What happened around you">
              <p className="eyebrow">OUTSIDE</p>
              <p>{section.paragraphs[0].replace(/^What happened around you:\s*/, '')}</p>
            </section>
            <section className="a1-comparison__side a1-comparison__side--inside" role="group" aria-label="What happened inside you">
              <p className="eyebrow">INSIDE</p>
              <p>{section.paragraphs[1].replace(/^What happened inside you:\s*/, '')}</p>
            </section>
          </div>
          <p className="a1-comparison__bridge">{section.paragraphs[2]}</p>
        </>
      ) : section.id === 'scripture' ? (
        <>
          <figure className="deep-dive-scripture a1-scripture" aria-label="Luke 6:45 Scripture passage">
            <span className="a1-scripture__index" aria-hidden="true">LUKE<br />06:45</span>
            <blockquote><p>{section.paragraphs[0]}</p></blockquote>
            <figcaption><cite>Luke 6:45 <span aria-hidden="true">·</span> World English Bible</cite></figcaption>
          </figure>
          {section.paragraphs.slice(1).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
        </>
      ) : section.id === 'practice' ? (
        <section className="deep-dive-guidance deep-dive-guidance--practice a1-practice" aria-label="Practice for the next few days">
          <p className="deep-dive-guidance__label">For the next few days</p>
          <p>{section.paragraphs[0]}</p>
          <p>When you catch one of those moments, stop briefly and ask:</p>
          <blockquote className="a1-practice__question" role="note">“What just happened in me?”</blockquote>
          <p>Then bring that moment before God without trying to force an answer.</p>
          <p>{section.paragraphs[2]}</p>
        </section>
      ) : section.id === 'carry-forward' ? (
        <section className="a1-calm-ending" role="region" aria-label="Carry forward">{renderParagraphs()}</section>
      ) : section.id === 'teaching' ? (
        <div className="a1-teaching">{renderParagraphs()}</div>
      ) : renderParagraphs()}
      {section.reveal ? (
        <div className="deep-dive-reveal">
          <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}><span>{section.reveal.label}</span><span className="deep-dive-reveal__icon" aria-hidden="true">⌄</span></button>
          {open ? <p>{section.reveal.text}</p> : null}
        </div>
      ) : null}
      {section.id === 'reflection' && review ? (
        <section className="deep-dive-saved-reflection" aria-label="Your saved reflection"><h2>Your reflection</h2><p>{reflection || 'You continued without writing.'}</p></section>
      ) : section.id === 'reflection' ? (
        <form className="deep-dive-reflection" action={formAction}>
          <label htmlFor="a1-reflection">{section.prompt}</label>
          <textarea
            id="a1-reflection"
            name="body"
            value={body}
            placeholder="Write only what you want to keep..."
            onChange={event => { setBody(event.target.value); setEditedSinceSave(true); }}
          />
          <div className="deep-dive-reflection__actions">
            <button className="button" type="submit" disabled={pending || !body.trim()}>{pending ? 'Saving…' : 'Save & continue'}</button>
            <button className="button button--secondary" type="submit" name="skip" value="true" disabled={pending}>Continue without writing</button>
          </div>
          <p className="status-message status-message--saved" role="status" aria-live="polite" aria-atomic="true">
            {saveState.saved && !editedSinceSave ? 'Reflection saved.' : ''}
          </p>
          {saveState.error ? <p className="field__error" role="alert">{saveState.error}</p> : null}
        </form>
      ) : null}
    </article>
  );
}
