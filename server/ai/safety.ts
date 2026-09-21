const FORBIDDEN = [
  /\b(?:you (?:have|are suffering from)|diagnos(?:e|is)|disorder)\b/i,
  /\b(?:trauma|traumatized)\b/i,
  /\b(?:god (?:told|is telling|says)|divine direction)\b/i,
  /\b(?:hidden motive|your motive is)\b/i,
  /\b(?:your calling|called to|calling is)\b/i,
  /\b(?:spiritual maturity|maturity score|\d+\s*(?:out of|\/)\s*10)\b/i,
  /\b(?:reconcile now|must reconcile|even if .*unsafe|remain in .*unsafe)\b/i,
];

export function reflectQuestionIssue(question: string): string | null {
  if (!question.trim().endsWith('?')) return 'Reflect output must contain questions only';
  if (question.length > 300) return 'Reflect question is too long';
  if (FORBIDDEN.some(pattern => pattern.test(question))) return 'Reflect output violates the AI safety policy';
  return null;
}
