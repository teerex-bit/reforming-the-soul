import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../../components/design-system/AppShell';
import { A1Lesson, type A1ReflectionSaveState } from '../../../../../components/deep-dive/A1Lesson';
import { A2Lesson, type A2ReflectionSaveState } from '../../../../../components/deep-dive/A2Lesson';
import { AwakenCompletionNav } from '../../../../../components/deep-dive/AwakenCompletionNav';
import { NewAwakenPage } from '../../../../../components/deep-dive/NewAwakenPage';
import { A1_SECTIONS } from '../../../../../content/deep-dive/v1';
import { A2_SECTIONS, type A2SectionId } from '../../../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { completeA1, completeA2, getA1, getA2, saveA1Reflection, saveA1Section, saveA2Reflection, saveA2Section } from '../../../../../server/services/deep-dive-service';
import type { A1SectionId } from '../../../../../domain/deep-dive';

function LessonProgress({ module, title, index, total }: { module: 'A1' | 'A2'; title: string; index: number; total: number }) {
  return <section className="deep-dive-progress" aria-label={`${module} lesson progress`}>
    <div className="deep-dive-progress__identity"><span className="eyebrow">AWAKEN · {module}</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
    <div className="deep-dive-progress__track"><label htmlFor={`${module}-section-progress`}>Section {index + 1} of {total}</label><progress id={`${module}-section-progress`} value={index + 1} max={total} /></div>
  </section>;
}

async function A2Page({ query }: { query: { section?: string } }) {
  const progress = await getA2();
  const candidate = query.section ?? (progress?.completedAt ? 'entry' : progress?.lastSectionId ?? 'entry');
  const requestedIndex = A2_SECTIONS.findIndex(section => section.id === candidate);
  const index = requestedIndex < 0 ? 0 : requestedIndex;
  const section = A2_SECTIONS[index];

  async function saveSection(formData: FormData) {
    'use server';
    const value = String(formData.get('section'));
    if (!A2_SECTIONS.some(item => item.id === value)) return;
    await saveA2Section(value as A2SectionId);
    redirect(`/deep-dive/awaken/catch-yourself-being-you?section=${value}`);
  }
  async function saveReflection(_: A2ReflectionSaveState, formData: FormData): Promise<A2ReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      await saveA2Section('go-deeper');
      redirect('/deep-dive/awaken/catch-yourself-being-you?section=go-deeper');
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
  async function finish() {
    'use server';
    await completeA2();
    redirect('/deep-dive/awaken/catch-yourself-being-you?section=carry-forward');
  }

  const next = A2_SECTIONS[index + 1];
  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-shell">
        <div className="deep-dive-topline">
          <Link href={progress?.completedAt ? '/deep-dive' : '/deep-dive/awaken'}>{progress?.completedAt ? '← Back' : 'Back to Awaken'}</Link>
          <span>Formation Journey <span aria-hidden="true">/</span> A2</span>
        </div>
        <div className="deep-dive-layout">
          <LessonProgress module="A2" title="Catch Yourself Being You" index={index} total={A2_SECTIONS.length} />
          <div className="deep-dive-content">
            <A2Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={saveReflection} review={Boolean(progress?.completedAt)} />
            {(section.id !== 'reflection' || progress?.completedAt) ? <footer className="deep-dive-transition">
              {next ? (
                <>
                  <div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
                  {progress?.completedAt ? <Link className="button" href={`/deep-dive/awaken/catch-yourself-being-you?section=${next.id}`}>Continue</Link> : <form action={saveSection}>
                    <input type="hidden" name="section" value={next.id} />
                    <button className="button" type="submit">{section.id === 'entry' ? 'Begin' : section.id === 'reflection' ? 'Keep going' : 'Continue'}</button>
                  </form>}
                </>
              ) : (
                <>
                  <p className="deep-dive-transition__title">Take these observations with you.</p>
                  {progress?.completedAt ? <AwakenCompletionNav module="a2" /> : <form action={finish}><button className="button" type="submit">Complete lesson</button></form>}
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
  if (stageId === 'awaken' && moduleId === 'catch-yourself-being-you') return A2Page({ query });
  if (stageId === 'awaken' && moduleId === 'your-reactions-have-a-history') return NewAwakenPage({ module: 'a3', query });
  if (stageId === 'awaken' && moduleId === 'formation-is-not-identity') return NewAwakenPage({ module: 'a4', query });
  if (stageId !== 'awaken' || moduleId !== 'pay-attention') notFound();
  const progress = await getA1();
  const requested = query.section as A1SectionId | undefined;
  const currentId = requested ?? (progress?.completedAt ? 'entry' : progress?.lastSectionId ?? 'entry');
  const index = Math.max(0, A1_SECTIONS.findIndex(s => s.id === currentId)); const section = A1_SECTIONS[index];
  async function saveSection(formData: FormData) { 'use server'; await saveA1Section(String(formData.get('section')) as A1SectionId); redirect(`/deep-dive/awaken/pay-attention?section=${String(formData.get('section'))}`); }
  async function saveReflection(_: A1ReflectionSaveState, formData: FormData): Promise<A1ReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      await saveA1Section('go-deeper');
      redirect('/deep-dive/awaken/pay-attention?section=go-deeper');
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
  async function finish() { 'use server'; await completeA1(); redirect('/deep-dive/awaken/pay-attention?section=carry-forward'); }
  const next = A1_SECTIONS[index + 1];
  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-shell">
        <div className="deep-dive-topline">
          <Link href={progress?.completedAt ? '/deep-dive' : '/deep-dive/awaken'}>{progress?.completedAt ? '← Back' : 'Back to Awaken'}</Link>
          <span>Formation Journey <span aria-hidden="true">/</span> A1</span>
        </div>
        <div className="deep-dive-layout">
          <LessonProgress module="A1" title="Pay Attention" index={index} total={A1_SECTIONS.length} />
          <div className="deep-dive-content">
            <A1Lesson section={section} index={index} total={A1_SECTIONS.length} reflection={progress?.reflection ?? null} saveReflection={saveReflection} review={Boolean(progress?.completedAt)} />
            {(section.id !== 'reflection' || progress?.completedAt) ? <footer className="deep-dive-transition">
              {next ? (
                <>
                  <div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
                  {progress?.completedAt ? <Link className="button" href={`/deep-dive/awaken/pay-attention?section=${next.id}`}>Continue</Link> : <form action={saveSection}>
                    <input type="hidden" name="section" value={next.id} />
                    <button className="button" type="submit">{section.id === 'entry' ? 'Begin' : section.id === 'moment' ? 'Notice it' : section.id === 'outside-inside' ? 'Keep going' : 'Continue'}</button>
                  </form>}
                </>
              ) : (
                <>
                  <p className="deep-dive-transition__title">You have reached the end of Pay Attention.</p>
                  {progress?.completedAt ? <AwakenCompletionNav module="a1" /> : <form action={finish}><button className="button" type="submit">Complete lesson</button></form>}
                </>
              )}
            </footer> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
