import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../components/design-system/AppShell';
export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) { const { stageId } = await params; if (stageId !== 'awaken') notFound(); return <AppShell stage="Awaken"><section className="deep-dive-home"><p className="eyebrow">AWAKEN</p><h1>Awaken</h1><p>Learn to notice what is already happening within you.</p><Link className="button" href="/deep-dive/awaken/pay-attention">Pay Attention</Link></section></AppShell>; }
