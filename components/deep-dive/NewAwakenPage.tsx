import Link from 'next/link';
import { requestA4Reframe } from '../../server/ai/a4-reframe';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { AwakenCompletionNav } from './AwakenCompletionNav';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import { A3Lesson, A4Lesson, type NewReflectionSaveState } from './A3A4Lesson';
import type { ReviewReflectionState } from './ReviewReflection';
import { A3_SECTIONS, A4_SECTIONS } from '../../content/deep-dive/v1/awaken/four-module-lessons';
import { editDeepDiveReflection, getA3, getA4, saveA3Section, saveA4Section, saveA3Reflection, saveA4Reflection, completeA3, completeA4 } from '../../server/services/deep-dive-service';
import { A3_MODULE_ID, A3_REFLECTION_PROMPT_ID, A4_MODULE_ID, A4_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export async function NewAwakenPage({ module, query }: { module: 'a3' | 'a4'; query: { section?: string } }) {
  const a3 = module === 'a3';
  const sections = a3 ? A3_SECTIONS : A4_SECTIONS;
  const slug = a3 ? 'your-reactions-have-a-history' : 'formation-is-not-identity';
  const title = a3 ? 'Your Reactions Have a History' : 'Formation Is Not Identity';
  const prefix = `/deep-dive/awaken/${slug}`;
  const progress = a3 ? await getA3() : await getA4();
  const state = lessonState({ sections, pathname: prefix, groupHref: '/deep-dive/awaken', requestedSection: query.section, lastSectionId: progress?.lastSectionId, completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const target = String(formData.get('section'));
    const result = await attemptLessonTransition(() => advanceLessonSection(sections, prefix, target, async id => { if (a3) await saveA3Section(id); else await saveA4Section(id); }, async () => { const progress = a3 ? await getA3() : await getA4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function reflection(_: NewReflectionSaveState, formData: FormData): Promise<NewReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(sections, prefix, 'practice', async id => { if (a3) await saveA3Section(id); else await saveA4Section(id); }, async () => { const progress = a3 ? await getA3() : await getA4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { saved: false, error: result.error };
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
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '').trim();
    if (!body) return { error: 'Write a reflection before saving.' };
    try { await editDeepDiveReflection(a3 ? A3_MODULE_ID : A4_MODULE_ID, a3 ? A3_REFLECTION_PROMPT_ID : A4_REFLECTION_PROMPT_ID, body); }
    catch { return { error: 'Could not save your reflection. Your words are still here; please try again.' }; }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(sections, prefix, async () => { if (a3) await completeA3(); else await completeA4(); }, async () => { const progress = a3 ? await getA3() : await getA4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }

  async function generateReframe(statement: string) {
    'use server';
    return requestA4Reframe(statement);
  }

  const review = state.completed;
  const reviewReflection = state.reviewReflection;
  return <AppShell stage="Awaken"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> {a3 ? 'A3' : 'A4'}</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label={`${a3 ? 'A3' : 'A4'} lesson progress`}>
        <div className="deep-dive-progress__identity"><span className="eyebrow">AWAKEN · {a3 ? 'A3' : 'A4'}</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="new-awaken-progress">Section {index + 1} of {sections.length}</label><progress id="new-awaken-progress" value={index + 1} max={sections.length} /></div>
      </section>
      <div className="deep-dive-content">
        {a3 ? <A3Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={reflection} editReflection={editReflection} review={reviewReflection} /> : <A4Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={reflection} editReflection={editReflection} review={reviewReflection} generateReframe={generateReframe} />}
        {(section.id !== 'reflection' || reviewReflection) ? <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {review ? <Link className="button" href={`${prefix}?section=${next.id}`}>Continue</Link> : <LessonTransitionForm action={advance} section={next.id} label="Continue" />}
          </> : <><p className="deep-dive-transition__title">{a3 ? 'Carry this thread with you.' : 'Awaken is complete. See Clearly is next.'}</p>{review ? <AwakenCompletionNav module={a3 ? 'a3' : 'a4'} /> : <LessonTransitionForm action={finish} label="Complete lesson" />}</>}
        </footer> : null}
      </div>
    </div>
  </section></AppShell>;
}
