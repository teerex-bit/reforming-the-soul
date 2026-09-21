import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { FormationHistory } from '../../../components/history/FormationHistory';
import { getFormationHistory } from '../../../server/services/history-service';

export default async function HistoryPage() {
  const history = await getFormationHistory();
  return <AppShell stage="Become"><section className="history-page"><p className="eyebrow">FORMATION HISTORY</p><h1>Your words and what they formed</h1><p className="history-page__intro">Your original wording stays distinct from structured records and AI-derived information.</p><FormationHistory items={history} /><Link className="button button--secondary" href="/dashboard">Back to dashboard</Link></section></AppShell>;
}
