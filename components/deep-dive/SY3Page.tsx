import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SY3Lesson, type SY3SaveState } from './SY3Lesson';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import type { ReviewReflectionState } from './ReviewReflection';
import { SY3_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sy3';
import { completeSY3, getSY3, saveSY3Story, saveSY3Reflection, saveSY3Section } from '../../server/services/see-clearly-sy3-service';
import { deleteSY3Reflection } from '../../server/services/see-clearly-sy3-service';

const route = '/deep-dive/see-clearly/the-learned-self-story';
const group = '/deep-dive/see-clearly#see-yourself-heading';

export async function SY3Page({ query }: { query: { section?: string } }) {
  const { progress, record, source } = await getSY3();
  const state = lessonState({ sections: SY3_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => advanceLessonSection(SY3_SECTIONS, route, String(formData.get('section')), saveSY3Section, async () => { const { progress } = await getSY3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveStory(_: SY3SaveState, formData: FormData): Promise<SY3SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SY3_SECTIONS, route, 'clarification', saveSY3Section, async () => { const { progress } = await getSY3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const wording = String(formData.get('wording') ?? '');
    if (!wording.trim()) return { error: 'Write a story or continue without saving one.' };
    const sourceId = String(formData.get('source_sy2_record_id') ?? '') || null;
    try { await saveSY3Story(wording, sourceId); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your words. They are still here; please try again.'); }
    if (completed) return { saved: true };
    redirect(`${route}?section=clarification`);
  }
  async function saveReflection(_: SY3SaveState, formData: FormData): Promise<SY3SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SY3_SECTIONS, route, 'carry-forward', saveSY3Section, async () => { const { progress } = await getSY3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSY3Reflection(body); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    redirect(`${route}?section=carry-forward`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSY3Reflection(body, false); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(SY3_SECTIONS, route, completeSY3, async () => { const { progress } = await getSY3(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function deleteReflection(_: SY3SaveState, __: FormData): Promise<SY3SaveState> {
    'use server';
    try { await deleteSY3Reflection(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your reflection. Please try again.'); }
    redirect(`${route}?section=reflection`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SY3</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SY3 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SY3</span><span aria-hidden="true">/</span><strong>The Learned Self-Story</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sy3-progress">Section {index + 1} of {SY3_SECTIONS.length}</label><progress id="sy3-progress" value={index + 1} max={SY3_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SY3Lesson section={section} record={record} source={source} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveStory={saveStory}
          saveReflection={saveReflection} editReflection={editReflection} deleteReflection={deleteReflection} />
        {(section.id !== 'recognition' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <LessonTransitionForm action={advance} section={next.id} label={index === 0 ? 'Begin' : 'Continue'} />}
          </> : <><p className="deep-dive-transition__title">Carry the question forward.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-yourself-sy4">Return to See Yourself Clearly · SY4 is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See Yourself Clearly</Link>
            </nav> : <LessonTransitionForm action={finish} label="Complete lesson" />}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
