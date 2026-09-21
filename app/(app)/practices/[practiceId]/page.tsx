import { notFound, redirect } from 'next/navigation';
import { AppShell } from '../../../../components/design-system/AppShell';
import { Button } from '../../../../components/design-system/Button';
import { PracticeReturnForm } from '../../../../components/practice/PracticeReturnForm';
import { PracticeReview } from '../../../../components/practice/PracticeReview';
import { closePractice, getPractice, recordPracticeReturn, reviewPractice } from '../../../../server/services/practice-service';

function isConflict(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && (error as {code?:string}).code === '40001'; }

export default async function PracticePage({params}:{params:Promise<{practiceId:string}>}) {
  const {practiceId}=await params; const practice=await getPractice(practiceId); if(!practice) notFound();
  async function saveReturn(values:{practiceId:string;expectedLockVersion:number;outcomeText:string}){'use server';try{await recordPracticeReturn(values);redirect(`/practices/${practiceId}`)}catch(error){if(isConflict(error))return {ok:false,conflict:true};throw error}}
  async function saveReview(values:{practiceId:string;expectedLockVersion:number;reviewText:string}){'use server';try{await reviewPractice(values);redirect(`/practices/${practiceId}`)}catch(error){if(isConflict(error))return {ok:false,conflict:true};throw error}}
  async function close(){'use server';await closePractice({practiceId,expectedLockVersion:practice.lockVersion});redirect('/dashboard')}
  return <AppShell stage="Become"><section className="practice-panel"><p className="practice-panel__state">{practice.state.replaceAll('_',' ')}</p><h1>Your practice</h1>
    <dl><dt>What you were trying to control</dt><dd>{practice.controlTargetText}</dd><dt>What is true now</dt><dd>{practice.presentTruthText}</dd><dt>Your next right step</dt><dd>{practice.nextRightStepText}</dd></dl>
    {practice.outcomeText?<><h2>What happened</h2><p>{practice.outcomeText}</p></>:null}
    {practice.reviewText?<><h2>What you noticed</h2><p>{practice.reviewText}</p></>:null}
    {practice.state==='waiting_for_real_life'?<PracticeReturnForm practiceId={practice.id} expectedLockVersion={practice.lockVersion} submit={saveReturn}/>:null}
    {practice.state==='ready_to_review'?<PracticeReview practiceId={practice.id} expectedLockVersion={practice.lockVersion} submit={saveReview}/>:null}
    {practice.state==='reviewed'?<form action={close}><Button type="submit">Close practice</Button></form>:null}
    {practice.state==='closed'?<p>This practice is closed.</p>:null}
  </section></AppShell>;
}
