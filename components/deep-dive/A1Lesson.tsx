'use client';
import { useState } from 'react';
import type { A1Section } from '../../content/deep-dive/v1/awaken/pay-attention';

export function A1Lesson({ section, index, total, reflection, saveReflection }: { section: A1Section; index: number; total: number; reflection: string | null; saveReflection: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return <article className="deep-dive-lesson">
    <p className="eyebrow">{section.eyebrow}</p><h1>{section.title}</h1>
    {section.paragraphs.map((p, i) => <p key={i} className={section.id === 'outside-inside' && i < 2 ? 'deep-dive-paired' : undefined}>{p}</p>)}
    {section.reveal ? <div className="deep-dive-reveal"><button type="button" onClick={() => setOpen(v => !v)}>{section.reveal.label}</button>{open ? <p>{section.reveal.text}</p> : null}</div> : null}
    {section.id === 'reflection' ? <form className="deep-dive-reflection" action={saveReflection}><label htmlFor="a1-reflection">{section.prompt}</label><textarea id="a1-reflection" name="body" defaultValue={reflection ?? ''} placeholder="Write only what you want to keep..." /><button className="button" type="submit">Save reflection</button><button className="button button--secondary" type="submit" name="skip" value="true">Skip for now</button></form> : null}
    <p className="deep-dive-progress">{index + 1} of {total}</p>
  </article>;
}
