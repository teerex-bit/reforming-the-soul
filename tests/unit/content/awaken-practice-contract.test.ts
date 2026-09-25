import { describe, expect, it } from 'vitest';
import { A2_SECTIONS } from '../../../content/deep-dive/v1/awaken/catch-yourself-being-you';
import { A3_SECTIONS, A4_SECTIONS } from '../../../content/deep-dive/v1/awaken/four-module-lessons';

describe('Awaken practice source contract', () => {
  it('keeps ASK and RECEIVE in the four-step practice without optional qualifiers', () => {
    const source = [...A2_SECTIONS, ...A3_SECTIONS, ...A4_SECTIONS]
      .flatMap(section => [section.eyebrow, section.title, ...section.paragraphs]).join(' ');
    expect(source).not.toMatch(/(?:ask|receive)[^.!?]{0,100}optional|optional[^.!?]{0,100}(?:ask|receive)/i);
    expect(source).not.toMatch(/if you want to, ask God|asking God and receiving[^.!?]*invitations/i);
  });
});
