import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../../components/design-system/AppShell';
import { A1Lesson } from '../../../../../components/deep-dive/A1Lesson';
import { A1_SECTIONS } from '../../../../../content/deep-dive/v1';
import { completeA1, getA1, saveA1Reflection, saveA1Section } from '../../../../../server/services/deep-dive-service';
import type { A1SectionId } from '../../../../../domain/deep-dive';

export default async function A1Page({ params, searchParams }: { params: Promise<{ stageId: string; moduleId: string }>; searchParams: Promise<{ section?: string }> }) {
  const { stageId, moduleId } = await params; const query = await searchParams;
  if (stageId !== 'awaken' || moduleId !== 'pay-attention') notFound();
  const progress = await getA1();
  const requested = query.section as A1SectionId | undefined;
  const currentId = requested ?? progress?.lastSectionId ?? 'entry';
  const index = Math.max(0, A1_SECTIONS.findIndex(s => s.id === currentId)); const section = A1_SECTIONS[index];
  async function saveSection(formData: FormData) { 'use server'; await saveA1Section(String(formData.get('section')) as A1SectionId); redirect(`/deep-dive/awaken/pay-attention?section=${String(formData.get('section'))}`); }
  async function saveReflection(formData: FormData) { 'use server'; if (formData.get('skip') !== 'true') await saveA1Reflection(String(formData.get('body') ?? '')); redirect(`/deep-dive/awaken/pay-attention?section=reflection`); }
  async function finish() { 'use server'; await completeA1(); redirect('/deep-dive'); }
  const next = A1_SECTIONS[index + 1];
  return <AppShell stage="Awaken"><section className="deep-dive-shell"><Link href="/deep-dive">Back to Awaken</Link><A1Lesson section={section} index={index} total={A1_SECTIONS.length} reflection={progress?.reflection ?? null} saveReflection={saveReflection} />{next ? <form action={saveSection}><input type="hidden" name="section" value={next.id} /><button className="button" type="submit">{section.id === 'entry' ? 'Begin' : section.id === 'moment' ? 'Notice it' : section.id === 'outside-inside' ? 'Keep going' : 'Continue'}</button></form> : <form action={finish}><button className="button" type="submit">Complete lesson</button></form>}</section></AppShell>;
}
