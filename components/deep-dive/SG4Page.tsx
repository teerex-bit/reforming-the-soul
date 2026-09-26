import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SG4Lesson, type SG4SaveState } from './SG4Lesson';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import type { ReviewReflectionState } from './ReviewReflection';
import { SG4_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg4';
import { completeSG4, getSG4, saveSG4Record, deleteSG4Record, saveSG4Reflection, saveSG4Section } from '../../server/services/see-clearly-sg4-service';
import { getSG3 } from '../../server/services/see-clearly-sg3-service';
import { deleteSG4Reflection } from '../../server/services/see-clearly-sg4-service';

const route = '/deep-dive/see-clearly/can-i-trust-god-here';
const group = '/deep-dive/see-clearly#see-god-heading';

export async function SG4Page({ query }: { query: { section?: string } }) {
  const [{ progress, record }, { record: sg3Context, progress: sg3Progress }] = await Promise.all([getSG4(), getSG3()]);
  if (!sg3Progress?.completedAt) redirect(group);
  const state = lessonState({ sections: SG4_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => advanceLessonSection(SG4_SECTIONS, route, String(formData.get('section')), saveSG4Section, async () => { const { progress } = await getSG4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveRecord(_: SG4SaveState, formData: FormData): Promise<SG4SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG4_SECTIONS, route, 'reflection', saveSG4Section, async () => { const { progress } = await getSG4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const situation = String(formData.get('situation') ?? '');
    const trustMeaning = String(formData.get('trustMeaning') ?? '');
    if (!situation.trim() || !trustMeaning.trim()) return { error: 'Write a situation and trust question, or continue without saving.' };
    try { await saveSG4Record(situation, trustMeaning); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your words. They are still here; please try again.'); }
    if (completed) return { saved: true };
    redirect(`${route}?section=reflection`);
  }
  async function saveReflection(_: SG4SaveState, formData: FormData): Promise<SG4SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG4_SECTIONS, route, 'carry-forward', saveSG4Section, async () => { const { progress } = await getSG4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSG4Reflection(body); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    redirect(`${route}?section=carry-forward`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSG4Reflection(body, false); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(SG4_SECTIONS, route, completeSG4, async () => { const { progress } = await getSG4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function deleteRecord(_: SG4SaveState, __: FormData): Promise<SG4SaveState> {
    'use server';
    try { await deleteSG4Record(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your saved trust question. Please try again.'); }
    redirect(`${route}?section=trust-question`);
  }
  async function deleteReflection(_: SG4SaveState, __: FormData): Promise<SG4SaveState> {
    'use server';
    try { await deleteSG4Reflection(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your reflection. Please try again.'); }
    redirect(`${route}?section=reflection`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SG4</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SG4 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SG4</span><span aria-hidden="true">/</span><strong>Can I Trust God Here?</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sg4-progress">Section {index + 1} of {SG4_SECTIONS.length}</label><progress id="sg4-progress" value={index + 1} max={SG4_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SG4Lesson section={section} record={record} sg3Context={sg3Context} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveRecord={saveRecord} deleteRecord={deleteRecord}
          saveReflection={saveReflection} editReflection={editReflection} deleteReflection={deleteReflection} />
        {(section.id !== 'trust-question' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <LessonTransitionForm action={advance} section={next.id} label={index === 0 ? 'Begin' : 'Continue'} />}
          </> : <><p className="deep-dive-transition__title">Carry this question into Become.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-god-heading">Return to See God Clearly · Become is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See God Clearly</Link>
            </nav> : <LessonTransitionForm action={finish} label="Complete lesson" />}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
