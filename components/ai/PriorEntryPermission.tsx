'use client';
import { Button } from '../design-system/Button';
import type { PriorEntryPermissionView } from '../../server/data/ai-context-grant-repository';

export function PriorEntryPermission({source,grant,revoke}:Readonly<{source:PriorEntryPermissionView;grant:()=>Promise<void>;revoke:(input:{grantId:string;expectedRevision:number})=>Promise<void>}>){
 return <section className="reflection-panel" aria-labelledby="prior-entry-title"><p className="eyebrow">SELECTED CONTEXT</p><h2 id="prior-entry-title">Use one earlier entry</h2><blockquote>{source.preview}</blockquote><p>Only this selected entry will be added to the next AI Reflect request. You can revoke permission before a future request.</p>
 {source.grant?<form action={()=>revoke({grantId:source.grant!.id,expectedRevision:source.grant!.revision})}><Button type="submit">Revoke permission</Button></form>:<form action={grant}><Button type="submit">Allow this entry</Button></form>}</section>
}
