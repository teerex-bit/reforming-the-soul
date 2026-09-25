export type A2SectionId = 'entry' | 'patterns' | 'scripture' | 'reflection' | 'go-deeper' | 'practice' | 'carry-forward';

export type A2Section = Readonly<{
  id: A2SectionId;
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
  prompt?: string;
}>;

export const A2_SECTIONS: readonly A2Section[] = [
  {
    id: 'entry', eyebrow: 'AWAKEN · A2', title: 'Catch Yourself Being You',
    paragraphs: [
      'Someone misunderstands you.',
      'Plans suddenly change.',
      'Conflict begins.',
      'Someone seems disappointed in you.',
      'You feel overlooked.',
      'Different situations. Same you.',
    ],
  },
  {
    id: 'patterns', eyebrow: 'NOTICE WHAT REPEATS', title: 'Different moments, familiar moves',
    paragraphs: [
      'Choose moments you recognize. For each one, name only the first movement you actually noticed, then the response that followed. You may leave either blank. This map stays on this page and is not saved.',
    ],
  },
  {
    id: 'scripture', eyebrow: 'A MOMENT TO CONSIDER', title: 'Seeing clearly',
    paragraphs: [
      'For if anyone is a hearer of the word and not a doer, he is like a man looking at his natural face in a mirror. For he sees himself, and goes away, and immediately forgets what kind of man he was.',
      'James uses a mirror to describe the value of seeing honestly. Seeing a repeated response is not condemnation. Give yourself truthful attention without turning it into self-criticism.',
      'A repeated response may connect with what you believe, expect, or feel is at stake. We will explore those connections later. For now, simply notice what repeats.',
    ],
  },
  {
    id: 'reflection', eyebrow: 'YOUR REFLECTION', title: 'What are you beginning to recognize?',
    paragraphs: [
      'Which response do you notice most often? What kinds of situations tend to bring it out?',
      'You might notice yourself moving toward control, withdrawal, fixing, pleasing, proving, or escape. These are ways of responding, not labels for who you are. You can also describe something else in your own words.',
    ],
    prompt: 'Which response do you notice most often, and what kinds of situations bring it out? Write only what you want to keep; your saved reflection belongs to your account.',
  },
  {
    id: 'go-deeper', eyebrow: 'A SMALL PRACTICE', title: 'Notice, name, ask, receive',
    paragraphs: [
      'Begin with what you can notice. Name it if you can. You may stop there. Asking God and receiving what becomes clear are invitations, not required outcomes.',
    ],
  },
  {
    id: 'practice', eyebrow: 'IN YOUR DAY', title: 'Catch yourself being you',
    paragraphs: [
      'Over the next few days, notice when a familiar response appears. Catch it as close to the moment as possible and name what is happening. If you want to, ask God what He wants you to notice. Receive only what becomes clear.',
      'You are not trying to fix the pattern yet. Collect observations. One sentence is enough: “I noticed I became defensive when I felt misunderstood.” You can stop at noticing or naming without forcing an explanation.',
    ],
  },
  {
    id: 'carry-forward', eyebrow: 'CARRY FORWARD', title: 'A pattern is something you can notice',
    paragraphs: [
      'The way you respond in a moment may reveal a pattern, but it does not automatically define who you are. As you keep noticing, pay attention to the language you use about yourself.',
      'For now, carry forward what you observed. These patterns will prepare you for a later lesson; you do not need to explain or change them today.',
    ],
  },
] as const;
