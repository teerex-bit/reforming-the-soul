import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SG2Lesson, type SG2SaveState } from './SG2Lesson';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import type { ReviewReflectionState } from './ReviewReflection';
import { SG2_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg2';
import { completeSG2, getSG2, saveSG2Record, deleteSG2Record, saveSG2Reflection, saveSG2Section } from '../../server/services/see-clearly-sg2-service';
import { getSG1 } from '../../server/services/see-clearly-sg1-service';
import { deleteSG2Reflection } from '../../server/services/see-clearly-sg2-service';

const route = '/deep-dive/see-clearly/what-i-expect-from-god';
const group = '/deep-dive/see-clearly#see-god-heading';

export async function SG2Page({ query }: { query: { section?: string } }) {
  const [{ progress, record }, { record: sg1Context, progress: sg1Progress }] = await Promise.all([getSG2(), getSG1()]);
  if (!sg1Progress?.completedAt) redirect(group);
  const state = lessonState({ sections: SG2_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => advanceLessonSection(SG2_SECTIONS, route, String(formData.get('section')), saveSG2Section, async () => { const { progress } = await getSG2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveRecord(_: SG2SaveState, formData: FormData): Promise<SG2SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG2_SECTIONS, route, 'reflection', saveSG2Section, async () => { const { progress } = await getSG2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const situation = String(formData.get('situation') ?? '');
    const expectation = String(formData.get('expectation') ?? '');
    if (!situation.trim() || !expectation.trim()) return { error: 'Write a moment and expectation, or continue without saving.' };
    try { await saveSG2Record(situation, expectation); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your words. They are still here; please try again.'); }
    if (completed) return { saved: true };
    redirect(`${route}?section=reflection`);
  }
  async function saveReflection(_: SG2SaveState, formData: FormData): Promise<SG2SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG2_SECTIONS, route, 'carry-forward', saveSG2Section, async () => { const { progress } = await getSG2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSG2Reflection(body); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    redirect(`${route}?section=carry-forward`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSG2Reflection(body, false); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(SG2_SECTIONS, route, completeSG2, async () => { const { progress } = await getSG2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function deleteRecord(_: SG2SaveState, __: FormData): Promise<SG2SaveState> {
    'use server';
    try { await deleteSG2Record(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your saved expectation. Please try again.'); }
    redirect(`${route}?section=recognition`);
  }
  async function deleteReflection(_: SG2SaveState, __: FormData): Promise<SG2SaveState> {
    'use server';
    try { await deleteSG2Reflection(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your reflection. Please try again.'); }
    redirect(`${route}?section=reflection`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SG2</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SG2 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SG2</span><span aria-hidden="true">/</span><strong>What I Expect From God</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sg2-progress">Section {index + 1} of {SG2_SECTIONS.length}</label><progress id="sg2-progress" value={index + 1} max={SG2_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SG2Lesson section={section} record={record} sg1Context={sg1Context} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveRecord={saveRecord} deleteRecord={deleteRecord}
          saveReflection={saveReflection} editReflection={editReflection} deleteReflection={deleteReflection} />
        {(section.id !== 'recognition' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <LessonTransitionForm action={advance} section={next.id} label={index === 0 ? 'Begin' : 'Continue'} />}
          </> : <><p className="deep-dive-transition__title">Carry this expectation into the next question.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-god-heading">Return to See God Clearly · SG3 is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See God Clearly</Link>
            </nav> : <LessonTransitionForm action={finish} label="Complete lesson" />}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
