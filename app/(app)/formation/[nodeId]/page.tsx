import { redirect } from 'next/navigation';
import { currentJourneyResume } from '../../../../server/services/current-journey';

/** Historical Phase 1 links remain valid entry points without exposing the retired curriculum. */
export default async function FormationNodePage() {
  const destination = await currentJourneyResume();
  redirect(destination.href);
}
