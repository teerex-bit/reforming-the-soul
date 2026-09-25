import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SC1Lesson, type SC1SaveState } from './SC1Lesson';
import { SC1_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sc1';
import { completeSC1, getSC1, saveSC1Reflection, saveSC1Response, saveSC1Section } from '../../server/services/see-clearly-sc1-service';

const route = '/deep-dive/see-clearly/facts-and-interpretation';

export async function SC1Page({ query }: { query: { section?: string } }) {
  const { progress, record, sources } = await getSC1();
  const completed = Boolean(progress?.completedAt);
  const requested = query.section ?? (completed ? 'entry' : progress?.lastSectionId ?? 'entry');
  const index = Math.max(0, SC1_SECTIONS.findIndex(section => section.id === requested));
  const section = SC1_SECTIONS[index];
  const next = SC1_SECTIONS[index + 1];

  async function advance(formData: FormData) {
    'use server';
    const target = String(formData.get('section'));
    if (!SC1_SECTIONS.some(item => item.id === target)) return;
    await saveSC1Section(target);
    redirect(`${route}?section=${target}`);
  }
  async function saveResponse(_: SC1SaveState, formData: FormData): Promise<SC1SaveState> {
    'use server';
    const eventFacts = String(formData.get('event_facts') ?? '').trim();
    const automaticInterpretation = String(formData.get('automatic_interpretation') ?? '').trim();
    const sourceEntryId = String(formData.get('source_entry_id') ?? '').trim() || null;
    if (!eventFacts || !automaticInterpretation) return { error: 'Write what happened and the meaning that came to you.' };
    try {
      await saveSC1Response({ eventFacts, automaticInterpretation, sourceEntryId });
    } catch {
      return { error: 'Could not save your moment. Your words are still here; please try again.' };
    }
    redirect(`${route}?section=reflection`);
  }
  async function saveReflection(_: SC1SaveState, formData: FormData): Promise<SC1SaveState> {
    'use server';
    try {
      if (formData.get('skip') === 'true') await saveSC1Section('practice');
      else {
        const body = String(formData.get('body') ?? '').trim();
        if (!body) return { error: 'Write a reflection or continue without writing.' };
        await saveSC1Reflection(body);
      }
    } catch {
      return { error: 'Could not save your reflection. Your words are still here; please try again.' };
    }
    redirect(`${route}?section=practice`);
  }
  async function finish() {
    'use server';
    await completeSC1();
    redirect(`${route}?section=carry-forward`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={index ? `${route}?section=${SC1_SECTIONS[index - 1].id}` : '/deep-dive/see-clearly'}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SC1</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SC1 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SC1</span><span aria-hidden="true">/</span><strong>Facts and Interpretation</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sc1-progress">Section {index + 1} of {SC1_SECTIONS.length}</label><progress id="sc1-progress" value={index + 1} max={SC1_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SC1Lesson section={section} record={record} reflection={progress?.reflection ?? null} sources={sources} completed={completed} saveResponse={saveResponse} saveReflection={saveReflection} />
        {(section.id !== 'interaction' && section.id !== 'reflection' || completed) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link> : <form action={advance}><input type="hidden" name="section" value={next.id} /><button className="button" type="submit">{index === 0 ? 'Begin' : 'Continue'}</button></form>}
          </> : <><p className="deep-dive-transition__title">Keep this distinction with you.</p>
            {completed ? <Link className="button" href="/deep-dive/see-clearly">Back to See Clearly</Link> : <form action={finish}><button className="button" type="submit">Complete lesson</button></form>}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
