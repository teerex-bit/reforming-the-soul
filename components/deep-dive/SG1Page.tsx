import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SG1Lesson, type SG1SaveState } from './SG1Lesson';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition, lessonSaveFailure } from './lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from './LessonTransitionForm';
import type { ReviewReflectionState } from './ReviewReflection';
import { SG1_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg1';
import { completeSG1, getSG1, saveSG1Image, deleteSG1Image, saveSG1Reflection, saveSG1Section } from '../../server/services/see-clearly-sg1-service';
import { deleteSG1Reflection } from '../../server/services/see-clearly-sg1-service';

const route = '/deep-dive/see-clearly/the-god-i-learned';
const group = '/deep-dive/see-clearly#see-god-heading';

export async function SG1Page({ query }: { query: { section?: string } }) {
  const { progress, record } = await getSG1();
  const state = lessonState({ sections: SG1_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => advanceLessonSection(SG1_SECTIONS, route, String(formData.get('section')), saveSG1Section, async () => { const { progress } = await getSG1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveImage(_: SG1SaveState, formData: FormData): Promise<SG1SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG1_SECTIONS, route, 'reflection', saveSG1Section, async () => { const { progress } = await getSG1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const wording = String(formData.get('wording') ?? '');
    if (!wording.trim()) return { error: 'Write a description or continue without saving one.' };
    const influence = String(formData.get('influence') ?? '');
    try { await saveSG1Image(wording, influence); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your words. They are still here; please try again.'); }
    if (completed) return { saved: true };
    redirect(`${route}?section=reflection`);
  }
  async function saveReflection(_: SG1SaveState, formData: FormData): Promise<SG1SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const result = await attemptLessonTransition(() => advanceLessonSection(SG1_SECTIONS, route, 'carry-forward', saveSG1Section, async () => { const { progress } = await getSG1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
      if (result.destination) redirect(result.destination);
      return { error: result.error, signIn: result.signIn };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSG1Reflection(body); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    redirect(`${route}?section=carry-forward`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSG1Reflection(body, false); }
    catch (error) { return lessonSaveFailure(error, 'We could not save your reflection. Your words are still here; please try again.'); }
    return { savedBody: body };
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(SG1_SECTIONS, route, completeSG1, async () => { const { progress } = await getSG1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function deleteImage(_: SG1SaveState, __: FormData): Promise<SG1SaveState> {
    'use server';
    try { await deleteSG1Image(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your saved picture. Please try again.'); }
    redirect(`${route}?section=recognition`);
  }
  async function deleteReflection(_: SG1SaveState, __: FormData): Promise<SG1SaveState> {
    'use server';
    try { await deleteSG1Reflection(); }
    catch (error) { return lessonSaveFailure(error, 'We could not delete your reflection. Please try again.'); }
    redirect(`${route}?section=reflection`);
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SG1</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SG1 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SG1</span><span aria-hidden="true">/</span><strong>The God I Learned</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sg1-progress">Section {index + 1} of {SG1_SECTIONS.length}</label><progress id="sg1-progress" value={index + 1} max={SG1_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SG1Lesson section={section} record={record} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveImage={saveImage} deleteImage={deleteImage}
          saveReflection={saveReflection} editReflection={editReflection} deleteReflection={deleteReflection} />
        {(section.id !== 'recognition' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <LessonTransitionForm action={advance} section={next.id} label={index === 0 ? 'Begin' : 'Continue'} />}
          </> : <><p className="deep-dive-transition__title">Carry this picture into the next question.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-god-heading">Return to See God Clearly · SG2 is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See God Clearly</Link>
            </nav> : <LessonTransitionForm action={finish} label="Complete lesson" />}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
