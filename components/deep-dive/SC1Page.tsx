import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SC1Lesson, type SC1SaveState } from './SC1Lesson';
import { seeClearlyNavigation } from './see-clearly-navigation';
import { lessonState, advanceLessonSection, finishLesson } from './lesson-state';
import type { ReviewReflectionState } from './ReviewReflection';
import { SC1_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sc1';
import { completeSC1, editSC1Reflection, getSC1, saveSC1Reflection, saveSC1Response, saveSC1Section } from '../../server/services/see-clearly-sc1-service';

const route = '/deep-dive/see-clearly/facts-and-interpretation';

export async function SC1Page({ query }: { query: { section?: string } }) {
  const { progress, record, sources } = await getSC1();
  const completionNavigation = seeClearlyNavigation('sc1');
  const state = lessonState({ sections: SC1_SECTIONS, pathname: route, groupHref: completionNavigation.backHref, requestedSection: query.section, lastSectionId: progress?.lastSectionId, completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(formData: FormData) {
    'use server';
    const target = String(formData.get('section'));
    const destination = await advanceLessonSection(SC1_SECTIONS, route, target, saveSC1Section, async () => Boolean((await getSC1()).progress?.completedAt));
    if (destination) redirect(destination);
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
    let destination: string | null = null;
    try {
      if (formData.get('skip') === 'true') {
        destination = await advanceLessonSection(SC1_SECTIONS, route, 'practice', saveSC1Section, async () => Boolean((await getSC1()).progress?.completedAt));
      }
      else {
        const body = String(formData.get('body') ?? '').trim();
        if (!body) return { error: 'Write a reflection or continue without writing.' };
        await saveSC1Reflection(body);
      }
    } catch {
      return { error: 'Could not save your reflection. Your words are still here; please try again.' };
    }
    redirect(destination ?? `${route}?section=practice`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '').trim();
    if (!body) return { error: 'Write a reflection before saving.' };
    try { await editSC1Reflection(body); }
    catch { return { error: 'Could not save your reflection. Your words are still here; please try again.' }; }
    return { savedBody: body };
  }
  async function finish() {
    'use server';
    redirect(await finishLesson(SC1_SECTIONS, route, completeSC1, async () => Boolean((await getSC1()).progress?.completedAt)));
  }

  const reviewReflection = state.reviewReflection;

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SY1</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SY1 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SY1</span><span aria-hidden="true">/</span><strong>Facts and Interpretation</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sc1-progress">Section {index + 1} of {SC1_SECTIONS.length}</label><progress id="sc1-progress" value={index + 1} max={SC1_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SC1Lesson section={section} record={record} reflection={progress?.reflection ?? null} sources={sources} completed={completed} reviewReflection={reviewReflection} saveResponse={saveResponse} saveReflection={saveReflection} editReflection={editReflection} />
        {(section.id !== 'interaction' && section.id !== 'reflection' || completed || section.id === 'reflection' && reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link> : <form action={advance}><input type="hidden" name="section" value={next.id} /><button className="button" type="submit">{index === 0 ? 'Begin' : 'Continue'}</button></form>}
          </> : <><p className="deep-dive-transition__title">Keep this distinction with you.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey"><Link className="button" href={completionNavigation.nextHref!}>{completionNavigation.nextLabel}</Link><Link className="deep-dive-completion-actions__back" href={completionNavigation.backHref}>{completionNavigation.backLabel}</Link></nav> : <form action={finish}><button className="button" type="submit">Complete lesson</button></form>}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
