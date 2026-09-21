'use client';
import { FormEvent, useState } from 'react'; import { Button } from '../design-system/Button'; import { Field } from '../design-system/Field';
type Result={ok:boolean;conflict?:boolean};
export function PracticeReturnForm({practiceId,expectedLockVersion,submit}:{practiceId:string;expectedLockVersion:number;submit(v:{practiceId:string;expectedLockVersion:number;outcomeText:string}):Promise<Result>}){
 const [text,setText]=useState('');const [conflict,setConflict]=useState(false);async function onSubmit(e:FormEvent){e.preventDefault();setConflict(false);const r=await submit({practiceId,expectedLockVersion,outcomeText:text});setConflict(Boolean(r.conflict));}
 return <form onSubmit={onSubmit}><Field id="practice-outcome" label="What happened when you took—or had an opportunity to take—the next right step?" value={text} onChange={e=>setText(e.target.value)} required />{conflict?<p role="alert">This practice changed in another session. Your words are still here; refresh before trying again.</p>:null}<Button type="submit">Save what happened</Button></form>;
}
