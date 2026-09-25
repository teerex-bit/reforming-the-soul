import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { A3Lesson, A4Lesson, type NewReflectionSaveState } from './A3A4Lesson';
import { A3_SECTIONS, A4_SECTIONS } from '../../content/deep-dive/v1/awaken/four-module-lessons';
import { getA3, getA4, saveA3Section, saveA4Section, saveA3Reflection, saveA4Reflection, completeA3, completeA4 } from '../../server/services/deep-dive-service';

export async function NewAwakenPage({ module, query }: { module: 'a3' | 'a4'; query: { section?: string } }) {
  const a3 = module === 'a3';
  const sections = a3 ? A3_SECTIONS : A4_SECTIONS;
  const slug = a3 ? 'your-reactions-have-a-history' : 'formation-is-not-identity';
  const title = a3 ? 'Your Reactions Have a History' : 'Formation Is Not Identity';
  const prefix = `/deep-dive/awaken/${slug}`;
  const progress = a3 ? await getA3() : await getA4();
  const requested = query.section ?? progress?.lastSectionId ?? 'entry';
  const index = Math.max(0, sections.findIndex(item => item.id === requested));
  const section = sections[index];
  const next = sections[index + 1];

  async function advance(formData: FormData) {
    'use server';
    const target = String(formData.get('section'));
    if (!sections.some(item => item.id === target)) return;
    if (a3) await saveA3Section(target); else await saveA4Section(target);
    redirect(`${prefix}?section=${target}`);
  }
  async function reflection(_: NewReflectionSaveState, formData: FormData): Promise<NewReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      if (a3) await saveA3Section('practice'); else await saveA4Section('practice');
      redirect(`${prefix}?section=practice`);
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { saved: false, error: 'Write a reflection or continue without writing.' };
    try {
      if (a3) { await saveA3Reflection(body); await saveA3Section('practice'); }
      else { await saveA4Reflection(body); await saveA4Section('practice'); }
    } catch {
      return { saved: false, error: 'Could not save your reflection. Your words are still here; please try again.' };
    }
    redirect(`${prefix}?section=practice`);
  }
  async function finish() {
    'use server';
    if (a3) await completeA3(); else await completeA4();
    redirect('/deep-dive');
  }

  const review = Boolean(progress?.completedAt);
  return <AppShell stage="Awaken"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href="/deep-dive">← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> {a3 ? 'A3' : 'A4'}</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label={`${a3 ? 'A3' : 'A4'} lesson progress`}>
        <div className="deep-dive-progress__identity"><span className="eyebrow">AWAKEN · {a3 ? 'A3' : 'A4'}</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="new-awaken-progress">Section {index + 1} of {sections.length}</label><progress id="new-awaken-progress" value={index + 1} max={sections.length} /></div>
      </section>
      <div className="deep-dive-content">
        {a3 ? <A3Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={reflection} review={review} /> : <A4Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={reflection} review={review} />}
        {(section.id !== 'reflection' || review) ? <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {review ? <Link className="button" href={`${prefix}?section=${next.id}`}>Continue</Link> : <form action={advance}><input type="hidden" name="section" value={next.id} /><button className="button" type="submit">Continue</button></form>}
          </> : <><p className="deep-dive-transition__title">{a3 ? 'Carry this thread with you.' : 'Awaken is complete. See Clearly is next.'}</p>{!review ? <form action={finish}><button className="button" type="submit">Complete lesson</button></form> : null}</>}
        </footer> : null}
      </div>
    </div>
  </section></AppShell>;
}
