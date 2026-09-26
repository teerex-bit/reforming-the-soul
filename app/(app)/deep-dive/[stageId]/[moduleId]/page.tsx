import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../../components/design-system/AppShell';
import { A1Lesson, type A1ReflectionSaveState } from '../../../../../components/deep-dive/A1Lesson';
import { A2Lesson, type A2ReflectionSaveState } from '../../../../../components/deep-dive/A2Lesson';
import type { ReviewReflectionState } from '../../../../../components/deep-dive/ReviewReflection';
import { AwakenCompletionNav } from '../../../../../components/deep-dive/AwakenCompletionNav';
import { lessonState, advanceLessonSection, finishLesson, attemptLessonTransition } from '../../../../../components/deep-dive/lesson-state';
import { LessonTransitionForm, type LessonTransitionState } from '../../../../../components/deep-dive/LessonTransitionForm';
import { NewAwakenPage } from '../../../../../components/deep-dive/NewAwakenPage';
import { SC1Page } from '../../../../../components/deep-dive/SC1Page';
import { SY2Page } from '../../../../../components/deep-dive/SY2Page';
import { A1_SECTIONS } from '../../../../../content/deep-dive/v1';
import { A2_SECTIONS } from '../../../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { completeA1, completeA2, editDeepDiveReflection, getA1, getA2, saveA1Reflection, saveA1Section, saveA2Reflection, saveA2Section } from '../../../../../server/services/deep-dive-service';
import { A1_MODULE_ID, A1_REFLECTION_PROMPT_ID, A2_MODULE_ID, A2_REFLECTION_PROMPT_ID } from '../../../../../domain/deep-dive';

function LessonProgress({ module, title, index, total }: { module: 'A1' | 'A2'; title: string; index: number; total: number }) {
  return <section className="deep-dive-progress" aria-label={`${module} lesson progress`}>
    <div className="deep-dive-progress__identity"><span className="eyebrow">AWAKEN · {module}</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
    <div className="deep-dive-progress__track"><label htmlFor={`${module}-section-progress`}>Section {index + 1} of {total}</label><progress id={`${module}-section-progress`} value={index + 1} max={total} /></div>
  </section>;
}

async function A2Page({ query }: { query: { section?: string } }) {
  const progress = await getA2();
  const state = lessonState({ sections: A2_SECTIONS, pathname: '/deep-dive/awaken/catch-yourself-being-you', groupHref: '/deep-dive/awaken', requestedSection: query.section, lastSectionId: progress?.lastSectionId, completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { index, section, next } = state;

  async function saveSection(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> {
    'use server';
    const value = String(formData.get('section'));
    const result = await attemptLessonTransition(() => advanceLessonSection(A2_SECTIONS, '/deep-dive/awaken/catch-yourself-being-you', value, saveA2Section, async () => { const progress = await getA2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }
  async function saveReflection(_: A2ReflectionSaveState, formData: FormData): Promise<A2ReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const destination = await advanceLessonSection(A2_SECTIONS, '/deep-dive/awaken/catch-yourself-being-you', 'go-deeper', saveA2Section, async () => { const progress = await getA2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; });
      if (destination) redirect(destination);
      return { saved: false };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { saved: false, error: 'Write a reflection or continue without writing.' };
    try {
      await saveA2Reflection(body);
      await saveA2Section('go-deeper');
    } catch {
      return { saved: false, error: 'Could not save your reflection. Your words are still here; please try again.' };
    }
    redirect('/deep-dive/awaken/catch-yourself-being-you?section=go-deeper');
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> {
    'use server';
    const result = await attemptLessonTransition(() => finishLesson(A2_SECTIONS, '/deep-dive/awaken/catch-yourself-being-you', completeA2, async () => { const progress = await getA2(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; }));
    if (result.destination) redirect(result.destination);
    return result;
  }

  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '').trim();
    if (!body) return { error: 'Write a reflection before saving.' };
    try { await editDeepDiveReflection(A2_MODULE_ID, A2_REFLECTION_PROMPT_ID, body); }
    catch { return { error: 'Could not save your reflection. Your words are still here; please try again.' }; }
    return { savedBody: body };
  }

  const reviewReflection = state.reviewReflection;
  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-shell">
        <div className="deep-dive-topline">
          <Link href={state.backHref}>← Back</Link>
          <span>Formation Journey <span aria-hidden="true">/</span> A2</span>
        </div>
        <div className="deep-dive-layout">
          <LessonProgress module="A2" title="Catch Yourself Being You" index={index} total={A2_SECTIONS.length} />
          <div className="deep-dive-content">
            <A2Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={saveReflection} editReflection={editReflection} review={reviewReflection} />
            {(section.id !== 'reflection' || reviewReflection) ? <footer className="deep-dive-transition">
              {next ? (
                <>
                  <div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
                  {progress?.completedAt ? <Link className="button" href={`/deep-dive/awaken/catch-yourself-being-you?section=${next.id}`}>Continue</Link> : <LessonTransitionForm action={saveSection} section={next.id} label={section.id === 'entry' ? 'Begin' : section.id === 'reflection' ? 'Keep going' : 'Continue'} />}
                </>
              ) : (
                <>
                  <p className="deep-dive-transition__title">Take these observations with you.</p>
                  {progress?.completedAt ? <AwakenCompletionNav module="a2" /> : <LessonTransitionForm action={finish} label="Complete lesson" />}
                </>
              )}
            </footer> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export default async function A1Page({ params, searchParams }: { params: Promise<{ stageId: string; moduleId: string }>; searchParams: Promise<{ section?: string }> }) {
  const { stageId, moduleId } = await params; const query = await searchParams;
  if (stageId === 'see-clearly' && moduleId === 'facts-and-interpretation') return SC1Page({ query });
  if (stageId === 'see-clearly' && moduleId === 'follow-the-formation-chain') return SY2Page({ query });
  if (stageId === 'awaken' && moduleId === 'catch-yourself-being-you') return A2Page({ query });
  if (stageId === 'awaken' && moduleId === 'your-reactions-have-a-history') return NewAwakenPage({ module: 'a3', query });
  if (stageId === 'awaken' && moduleId === 'formation-is-not-identity') return NewAwakenPage({ module: 'a4', query });
  if (stageId !== 'awaken' || moduleId !== 'pay-attention') notFound();
  const progress = await getA1();
  const state = lessonState({ sections: A1_SECTIONS, pathname: '/deep-dive/awaken/pay-attention', groupHref: '/deep-dive/awaken', requestedSection: query.section, lastSectionId: progress?.lastSectionId, completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { index, section, next } = state;
  async function saveSection(_: LessonTransitionState, formData: FormData): Promise<LessonTransitionState> { 'use server'; const result = await attemptLessonTransition(() => advanceLessonSection(A1_SECTIONS, '/deep-dive/awaken/pay-attention', String(formData.get('section')), saveA1Section, async () => { const progress = await getA1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; })); if (result.destination) redirect(result.destination); return result; }
  async function saveReflection(_: A1ReflectionSaveState, formData: FormData): Promise<A1ReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const destination = await advanceLessonSection(A1_SECTIONS, '/deep-dive/awaken/pay-attention', 'go-deeper', saveA1Section, async () => { const progress = await getA1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; });
      if (destination) redirect(destination);
      return { saved: false };
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { saved: false, error: 'Write a reflection or continue without writing.' };
    try {
      await saveA1Reflection(body);
      await saveA1Section('go-deeper');
    } catch {
      return { saved: false, error: 'Could not save your reflection. Your words are still here; please try again.' };
    }
    redirect('/deep-dive/awaken/pay-attention?section=go-deeper');
  }
  async function finish(_: LessonTransitionState, __: FormData): Promise<LessonTransitionState> { 'use server'; const result = await attemptLessonTransition(() => finishLesson(A1_SECTIONS, '/deep-dive/awaken/pay-attention', completeA1, async () => { const progress = await getA1(); return { completed: Boolean(progress?.completedAt), lastSectionId: progress?.lastSectionId }; })); if (result.destination) redirect(result.destination); return result; }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '').trim();
    if (!body) return { error: 'Write a reflection before saving.' };
    try { await editDeepDiveReflection(A1_MODULE_ID, A1_REFLECTION_PROMPT_ID, body); }
    catch { return { error: 'Could not save your reflection. Your words are still here; please try again.' }; }
    return { savedBody: body };
  }
  const reviewReflection = state.reviewReflection;
  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-shell">
        <div className="deep-dive-topline">
          <Link href={state.backHref}>← Back</Link>
          <span>Formation Journey <span aria-hidden="true">/</span> A1</span>
        </div>
        <div className="deep-dive-layout">
          <LessonProgress module="A1" title="Pay Attention" index={index} total={A1_SECTIONS.length} />
          <div className="deep-dive-content">
            <A1Lesson section={section} index={index} total={A1_SECTIONS.length} reflection={progress?.reflection ?? null} saveReflection={saveReflection} editReflection={editReflection} review={reviewReflection} />
            {(section.id !== 'reflection' || reviewReflection) ? <footer className="deep-dive-transition">
              {next ? (
                <>
                  <div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
                  {progress?.completedAt ? <Link className="button" href={`/deep-dive/awaken/pay-attention?section=${next.id}`}>Continue</Link> : <LessonTransitionForm action={saveSection} section={next.id} label={section.id === 'entry' ? 'Begin' : section.id === 'moment' ? 'Notice it' : section.id === 'outside-inside' ? 'Keep going' : 'Continue'} />}
                </>
              ) : (
                <>
                  <p className="deep-dive-transition__title">You have reached the end of Pay Attention.</p>
                  {progress?.completedAt ? <AwakenCompletionNav module="a1" /> : <LessonTransitionForm action={finish} label="Complete lesson" />}
                </>
              )}
            </footer> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
