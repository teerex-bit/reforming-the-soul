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
      'Our responses can repeat. What looks like a series of separate moments may reveal a familiar way of moving through life.',
      'You may become defensive when misunderstood, withdraw when tension rises, try to control a plan when it changes, or work harder when you feel overlooked. This lesson is an invitation to notice those repetitions without turning them into a label.',
    ],
  },
  {
    id: 'patterns', eyebrow: 'NOTICE WHAT REPEATS', title: 'Different moments, familiar moves',
    paragraphs: [
      'The same pattern can show up in different situations. Avoiding conflict might look like putting off a hard conversation, softening what you think, or agreeing before you are ready. Wanting things done “right” can sometimes become a way of trying to control what feels uncertain.',
      'These examples are not categories to fit yourself into. They are ways to begin asking whether a response you have noticed before is showing up again.',
    ],
  },
  {
    id: 'scripture', eyebrow: 'A MOMENT TO CONSIDER', title: 'Seeing clearly',
    paragraphs: [
      'For if anyone is a hearer of the word and not a doer, he is like a man looking at his natural face in a mirror. For he sees himself, and goes away, and immediately forgets what kind of man he was.',
      'James uses a mirror to describe the value of seeing honestly. In this lesson, the mirror is a way to notice recurring responses—perhaps impatience, fear, pride, insecurity, people-pleasing, resentment, or control. Seeing a pattern is not condemnation. Give yourself truthful attention without turning it into self-criticism.',
      'A repeated response may connect with what you believe, expect, or feel is at stake. We will explore those connections later. For now, simply notice what repeats.',
    ],
  },
  {
    id: 'reflection', eyebrow: 'YOUR REFLECTION', title: 'What are you beginning to recognize?',
    paragraphs: [
      'Think across several moments you have noticed recently. Do any of them seem similar?',
      'What situations tend to bring out your strongest response? When you feel threatened, uncomfortable, disappointed, or uncertain, what do you usually do?',
      'Do you tend to move toward people, move away, or try to control what is happening? What response are you beginning to recognize more quickly?',
    ],
    prompt: 'Write about any of these questions, in any order. Share only what you want to keep; your saved reflection belongs to your account.',
  },
  {
    id: 'go-deeper', eyebrow: 'GO DEEPER', title: 'Try finishing a few sentences',
    paragraphs: [
      'I tend to become defensive when…',
      'I tend to withdraw when…',
      'I tend to become anxious when…',
      'I tend to want control when…',
      'What seems common across the situations that bring out my strongest responses is…',
      'You do not need to complete every sentence or fit yourself into a category. Stay with what feels true, and notice what the moments may have in common.',
    ],
  },
  {
    id: 'practice', eyebrow: 'A SMALL PRACTICE', title: 'Notice the next repetition',
    paragraphs: [
      'Over the next few days, when you notice a strong response, pause and ask: “Have I felt this before?” and “What was similar about those situations?”',
      'Do not rush to interpret what you find. Collect observations. If it helps, write one sentence each day: “I noticed I became defensive when I felt misunderstood,” or “I wanted control when I felt unsure.”',
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
