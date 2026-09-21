'use client';
import { FormEvent, useState } from 'react';
import { Button } from '../design-system/Button';
import { Field } from '../design-system/Field';
export function PracticeForm({ submit }: { submit(values: { controlTargetText: string; presentTruthText: string; nextRightStepText: string }): Promise<void> }) {
  const [values,setValues]=useState({controlTargetText:'',presentTruthText:'',nextRightStepText:''});
  async function onSubmit(e:FormEvent){e.preventDefault();await submit(values);}
  return <section className="reflection-panel"><p className="eyebrow">BECOME</p><h1>Choose a next right step</h1><form onSubmit={onSubmit}>
    <Field id="control-target" label="What outcome am I trying to control?" value={values.controlTargetText} onChange={e=>setValues({...values,controlTargetText:e.target.value})} required />
    <Field id="present-truth" label="What is actually true in the present moment?" value={values.presentTruthText} onChange={e=>setValues({...values,presentTruthText:e.target.value})} required />
    <Field id="next-right-step" label="What is the next right step?" value={values.nextRightStepText} onChange={e=>setValues({...values,nextRightStepText:e.target.value})} required />
    <Button type="submit">Save as open practice</Button></form></section>;
}
