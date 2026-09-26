import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '../design-system/AppShell';
import { SY2Lesson, type SY2SaveState } from './SY2Lesson';
import { lessonState, advanceLessonSection, finishLesson } from './lesson-state';
import type { ReviewReflectionState } from './ReviewReflection';
import { SY2_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sy2';
import { sy2ChainFields } from '../../domain/deep-dive';
import type { SY2Chain } from '../../server/data/see-clearly-sy2-repository';
import { completeSY2, getSY2, saveSY2Chain, saveSY2Reflection, saveSY2Section } from '../../server/services/see-clearly-sy2-service';

const route = '/deep-dive/see-clearly/follow-the-formation-chain';
const group = '/deep-dive/see-clearly#see-yourself-heading';

export async function SY2Page({ query }: { query: { section?: string } }) {
  const { progress, record, source } = await getSY2();
  const state = lessonState({ sections: SY2_SECTIONS, pathname: route, groupHref: group,
    requestedSection: query.section, lastSectionId: progress?.lastSectionId,
    completedAt: progress?.completedAt, reflectionSection: 'reflection' });
  const { completed, index, section, next } = state;

  async function advance(formData: FormData) {
    'use server';
    const destination = await advanceLessonSection(SY2_SECTIONS, route, String(formData.get('section')), saveSY2Section, async () => Boolean((await getSY2()).progress?.completedAt));
    if (destination) redirect(destination);
  }
  async function saveChain(_: SY2SaveState, formData: FormData): Promise<SY2SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const destination = await advanceLessonSection(SY2_SECTIONS, route, 'distinction', saveSY2Section, async () => Boolean((await getSY2()).progress?.completedAt));
      if (destination) redirect(destination);
      return {};
    }
    const values = Object.fromEntries(sy2ChainFields.map(field => {
      const wording = String(formData.get(field) ?? '');
      return [field, wording.trim() ? wording : null];
    })) as Record<typeof sy2ChainFields[number], string | null>;
    const chain: SY2Chain = { ...values, sourceSc1RecordId: String(formData.get('source_sc1_record_id') ?? '') || null };
    if (!sy2ChainFields.some(field => chain[field])) return { error: 'Write a link or continue without saving this trace.' };
    try { await saveSY2Chain(chain); }
    catch { return { error: 'Could not save your trace. Your words are still here; please try again.' }; }
    if (completed) return { saved: true };
    redirect(`${route}?section=distinction`);
  }
  async function saveReflection(_: SY2SaveState, formData: FormData): Promise<SY2SaveState> {
    'use server';
    if (formData.get('skip') === 'true') {
      const destination = await advanceLessonSection(SY2_SECTIONS, route, 'practice', saveSY2Section, async () => Boolean((await getSY2()).progress?.completedAt));
      if (destination) redirect(destination);
      return {};
    }
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection or continue without writing.' };
    try { await saveSY2Reflection(body); }
    catch { return { error: 'Could not save your reflection. Your words are still here; please try again.' }; }
    redirect(`${route}?section=practice`);
  }
  async function editReflection(_: ReviewReflectionState, formData: FormData): Promise<ReviewReflectionState> {
    'use server';
    const body = String(formData.get('body') ?? '');
    if (!body.trim()) return { error: 'Write a reflection before saving.' };
    try { await saveSY2Reflection(body, false); }
    catch { return { error: 'Could not save your reflection. Your words are still here; please try again.' }; }
    return { savedBody: body };
  }
  async function finish() {
    'use server';
    redirect(await finishLesson(SY2_SECTIONS, route, completeSY2, async () => Boolean((await getSY2()).progress?.completedAt)));
  }

  return <AppShell stage="See Clearly"><section className="deep-dive-shell">
    <div className="deep-dive-topline"><Link href={state.backHref}>← Back</Link><span>Formation Journey <span aria-hidden="true">/</span> SY2</span></div>
    <div className="deep-dive-layout">
      <section className="deep-dive-progress" aria-label="SY2 lesson progress">
        <div className="deep-dive-progress__identity"><span className="eyebrow">SEE CLEARLY · SY2</span><span aria-hidden="true">/</span><strong>Follow the Formation Chain</strong></div>
        <div className="deep-dive-progress__track"><label htmlFor="sy2-progress">Section {index + 1} of {SY2_SECTIONS.length}</label><progress id="sy2-progress" value={index + 1} max={SY2_SECTIONS.length} /></div>
      </section>
      <div className="deep-dive-content">
        <SY2Lesson section={section} record={record} source={source} reflection={progress?.reflection ?? null}
          completed={completed} reviewReflection={state.reviewReflection} saveChain={saveChain}
          saveReflection={saveReflection} editReflection={editReflection} />
        {(section.id !== 'trace' && section.id !== 'reflection' || completed || section.id === 'reflection' && state.reviewReflection) && <footer className="deep-dive-transition">
          {next ? <><div><p className="eyebrow">NEXT</p><p className="deep-dive-transition__title">{next.title}</p></div>
            {completed ? <Link className="button" href={`${route}?section=${next.id}`}>Continue</Link>
              : <form action={advance}><input type="hidden" name="section" value={next.id} /><button className="button" type="submit">{index === 0 ? 'Begin' : 'Continue'}</button></form>}
          </> : <><p className="deep-dive-transition__title">See where the chain begins.</p>
            {completed ? <nav className="deep-dive-completion-actions" aria-label="Continue your journey">
              <Link className="button" href="/deep-dive/see-clearly#see-yourself-sy3">Return to See Yourself Clearly · SY3 is next</Link>
              <Link className="deep-dive-completion-actions__back" href={group}>Back to See Yourself Clearly</Link>
            </nav> : <form action={finish}><button className="button" type="submit">Complete lesson</button></form>}
          </>}
        </footer>}
      </div>
    </div>
  </section></AppShell>;
}
