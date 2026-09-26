import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SG3Lesson, type SG3SaveState } from './SG3Lesson';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import type { ReviewReflectionState } from './ReviewReflection';
import { SG3_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg3';
import { completeSG3, getSG3, saveSG3Record, deleteSG3Record, saveSG3Reflection, saveSG3Section } from '../../server/services/see-clearly-sg3-service';
import { getSG2 } from '../../server/services/see-clearly-sg2-service';
import { deleteSG3Reflection } from '../../server/services/see-clearly-sg3-service';

const route = '/deep-dive/see-clearly/jesus-shows-us-the-father';
const group = '/deep-dive/see-clearly#see-god-heading';

export async function SG3Page({ query }: { query: { section?: string } }) {
  const [{ progress, record }, { record: sg2Context, progress: sg2Progress }] = await Promise.all([getSG3(), getSG2()]);
  if (!sg2Progress?.completedAt) redirect(group);
  const state = lessonState({ sections: SG3_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => advanceLessonSection(SG3_SECTIONS, route, String(formData.get('section')), saveSG3Section, async () => { const { progress } = await getSG3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveRecord(_: SG3SaveState, formData: FormData): Promise<SG3SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG3_SECTIONS, route, 'reflection', saveSG3Section, async () => { const { progress } = await getSG3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const observation = String(formData.get('observation') ?? '');
    if (!observation.trim()) return { error: 'Write an observation or continue without saving.' };
    try { await saveSG3Record(observation); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your words. They are still here; please try again.'); }
    if (completed) return { saved: true };
    redirect(`${route}?section=reflection`);
  }
  async function saveReflection(_: SG3SaveState, formData: FormData): Promise<SG3SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG3_SECTIONS, route, 'carry-forward', saveSG3Section, async () => { const { progress } = await getSG3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSG3Reflection(body); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    redirect(`${route}?section=carry-forward`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSG3Reflection(body, false); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(SG3_SECTIONS, route, completeSG3, async () => { const { progress } = await getSG3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function deleteRecord(_: SG3SaveState, __: FormData): Promise<SG3SaveState> {
    'use server';
    try { await deleteSG3Record(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your saved observation. Please try again.'); }
    redirect(`${route}?section=observation`);
  }
  async function deleteReflection(_: SG3SaveState, __: FormData): Promise<SG3SaveState> {
    'use server';
    try { await deleteSG3Reflection(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your reflection. Please try again.'); }
    redirect(`${route}?section=reflection`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SG3</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SG3 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SG3</span><span aria-hidden="true">/</span><strong>Jesus Shows Us the Father</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sg3-progress">Section {index + 1} of {SG3_SECTIONS.length}</label><progress id="sg3-progress" value={index + 1} max={SG3_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SG3Lesson section={section} record={record} sg2Context={sg2Context} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveRecord={saveRecord} deleteRecord={deleteRecord}
          saveReflection={saveReflection} editReflection={editReflection} deleteReflection={deleteReflection} />
        {(section.id !== 'observation' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <LessonTransitionForm action={advance} section={next.id} label={index === 0 ? 'Begin' : 'Continue'} />}
          </> : <><p className="deep-dive-transition__title">Carry this observation into the next question.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-god-heading">Return to See God Clearly · SG4 is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See God Clearly</Link>
            </nav> : <LessonTransitionForm action={finish} label="Complete lesson" />}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
