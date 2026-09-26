import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SY4Lesson, type SY4SaveState } from './SY4Lesson';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import type { ReviewReflectionState } from './ReviewReflection';
import { SY4_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sy4';
import { completeSY4, getSY4, saveSY4Truth, saveSY4Reflection, saveSY4Section } from '../../server/services/see-clearly-sy4-service';
import { deleteSY4Reflection } from '../../server/services/see-clearly-sy4-service';

const route = '/deep-dive/see-clearly/what-is-actually-true-about-me';
const group = '/deep-dive/see-clearly#see-yourself-heading';

export async function SY4Page({ query }: { query: { section?: string } }) {
  const { progress, record, source } = await getSY4();
  const state = lessonState({ sections: SY4_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => advanceLessonSection(SY4_SECTIONS, route, String(formData.get('section')), saveSY4Section, async () => { const { progress } = await getSY4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveTruth(_: SY4SaveState, formData: FormData): Promise<SY4SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SY4_SECTIONS, route, 'reflection', saveSY4Section, async () => { const { progress } = await getSY4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const wording = String(formData.get('wording') ?? '');
    if (!wording.trim()) return { error: 'Write a truth statement or continue without saving one.' };
    const sourceId = String(formData.get('source_sy3_record_id') ?? '') || null;
    try { await saveSY4Truth(wording, sourceId); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your words. They are still here; please try again.'); }
    if (completed) return { saved: true };
    redirect(`${route}?section=reflection`);
  }
  async function saveReflection(_: SY4SaveState, formData: FormData): Promise<SY4SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SY4_SECTIONS, route, 'carry-forward', saveSY4Section, async () => { const { progress } = await getSY4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSY4Reflection(body); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    redirect(`${route}?section=carry-forward`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSY4Reflection(body, false); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(SY4_SECTIONS, route, completeSY4, async () => { const { progress } = await getSY4(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function deleteReflection(_: SY4SaveState, __: FormData): Promise<SY4SaveState> {
    'use server';
    try { await deleteSY4Reflection(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your reflection. Please try again.'); }
    redirect(`${route}?section=reflection`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SY4</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SY4 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SY4</span><span aria-hidden="true">/</span><strong>What Is Actually True About Me</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sy4-progress">Section {index + 1} of {SY4_SECTIONS.length}</label><progress id="sy4-progress" value={index + 1} max={SY4_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SY4Lesson section={section} record={record} source={source} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveTruth={saveTruth}
          saveReflection={saveReflection} editReflection={editReflection} deleteReflection={deleteReflection} />
        {(section.id !== 'look-again' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <LessonTransitionForm action={advance} section={next.id} label={index === 0 ? 'Begin' : 'Continue'} />}
          </> : <><p className="deep-dive-transition__title">Carry what is true into ordinary moments.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-god-heading">Return to See Clearly · See God Clearly is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See Yourself Clearly</Link>
            </nav> : <LessonTransitionForm action={finish} label="Complete lesson" />}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
