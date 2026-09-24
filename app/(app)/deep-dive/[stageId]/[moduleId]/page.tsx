import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../../components/design-system/AppShell';
import { A1Lesson, type A1ReflectionSaveState } from '../../../../../components/deep-dive/A1Lesson';
import { A2Lesson, type A2ReflectionSaveState } from '../../../../../components/deep-dive/A2Lesson';
import { A1_SECTIONS } from '../../../../../content/deep-dive/v1';
import { A2_SECTIONS, type A2SectionId } from '../../../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { completeA1, completeA2, getA1, getA2, saveA1Reflection, saveA1Section, saveA2Reflection, saveA2Section } from '../../../../../server/services/deep-dive-service';
import type { A1SectionId } from '../../../../../domain/deep-dive';

async function A2Page({ query }: { query: { section?: string } }) {
  const progress = await getA2();
  const candidate = query.section ?? progress?.lastSectionId ?? 'entry';
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
    await saveA2Reflection(String(formData.get('body') ?? ''));
    return { saved: true };
  }
  async function finish() {
    'use server';
    await completeA2();
    redirect('/deep-dive');
  }

  const next = A2_SECTIONS[index + 1];
  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-shell">
        <div className="deep-dive-topline">
          <Link href="/deep-dive/awaken">Back to Awaken</Link>
          <span>Formation Journey <span aria-hidden="true">/</span> A2</span>
        </div>
        <div className="deep-dive-layout">
          <div className="deep-dive-content">
            <A2Lesson section={section} reflection={progress?.reflection ?? null} saveReflection={saveReflection} />
            <footer className="deep-dive-transition">
              {next ? (
                <>
                  <div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
                  <form action={saveSection}>
                    <input type="hidden" name="section" value={next.id} />
                    <button className="button" type="submit">{section.id === 'entry' ? 'Begin' : section.id === 'reflection' ? 'Keep going' : 'Continue'}</button>
                  </form>
                </>
              ) : (
                <>
                  <p className="deep-dive-transition__title">Take these observations with you.</p>
                  <form action={finish}><button className="button" type="submit">Complete lesson</button></form>
                </>
              )}
            </footer>
          </div>
          <aside className="deep-dive-lesson-meta" aria-label="A2 lesson progress">
            <p className="eyebrow">AWAKEN · A2</p>
            <h2>Catch Yourself Being You</h2>
            <label htmlFor="a2-section-progress">Section {index + 1} of {A2_SECTIONS.length}</label>
            <progress id="a2-section-progress" value={index + 1} max={A2_SECTIONS.length} />
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

export default async function A1Page({ params, searchParams }: { params: Promise<{ stageId: string; moduleId: string }>; searchParams: Promise<{ section?: string }> }) {
  const { stageId, moduleId } = await params; const query = await searchParams;
  if (stageId === 'awaken' && moduleId === 'catch-yourself-being-you') return A2Page({ query });
  if (stageId !== 'awaken' || moduleId !== 'pay-attention') notFound();
  const progress = await getA1();
  const requested = query.section as A1SectionId | undefined;
  const currentId = requested ?? progress?.lastSectionId ?? 'entry';
  const index = Math.max(0, A1_SECTIONS.findIndex(s => s.id === currentId)); const section = A1_SECTIONS[index];
  async function saveSection(formData: FormData) { 'use server'; await saveA1Section(String(formData.get('section')) as A1SectionId); redirect(`/deep-dive/awaken/pay-attention?section=${String(formData.get('section'))}`); }
  async function saveReflection(_: A1ReflectionSaveState, formData: FormData): Promise<A1ReflectionSaveState> {
    'use server';
    if (formData.get('skip') === 'true') return { saved: false };
    await saveA1Reflection(String(formData.get('body') ?? ''));
    return { saved: true };
  }
  async function finish() { 'use server'; await completeA1(); redirect('/deep-dive'); }
  const next = A1_SECTIONS[index + 1];
  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-shell">
        <div className="deep-dive-topline">
          <Link href="/deep-dive/awaken">Back to Awaken</Link>
          <span>Formation Journey <span aria-hidden="true">/</span> A1</span>
        </div>
        <div className="deep-dive-layout">
          <div className="deep-dive-content">
            <A1Lesson section={section} index={index} total={A1_SECTIONS.length} reflection={progress?.reflection ?? null} saveReflection={saveReflection} />
            <footer className="deep-dive-transition">
              {next ? (
                <>
                  <div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
                  <form action={saveSection}>
                    <input type="hidden" name="section" value={next.id} />
                    <button className="button" type="submit">{section.id === 'entry' ? 'Begin' : section.id === 'moment' ? 'Notice it' : section.id === 'outside-inside' ? 'Keep going' : 'Continue'}</button>
                  </form>
                </>
              ) : (
                <>
                  <p className="deep-dive-transition__title">You have reached the end of Pay Attention.</p>
                  <form action={finish}><button className="button" type="submit">Complete lesson</button></form>
                </>
              )}
            </footer>
          </div>
          <aside className="deep-dive-lesson-meta" aria-label="A1 lesson progress">
            <p className="eyebrow">AWAKEN · A1</p>
            <h2>Pay Attention</h2>
            <label htmlFor="a1-section-progress">Section {index + 1} of {A1_SECTIONS.length}</label>
            <progress id="a1-section-progress" value={index + 1} max={A1_SECTIONS.length} />
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
