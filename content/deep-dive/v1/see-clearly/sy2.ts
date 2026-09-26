export type SY2SectionId = 'entry' | 'chain' | 'example' | 'trace' | 'distinction' | 'reflection' | 'practice' | 'carry-forward';
export type SY2Section = Readonly<{ id: SY2SectionId; eyebrow: string; title: string; paragraphs: readonly string[] }>;

export const SY2_SECTIONS: readonly SY2Section[] = [
  { id: 'entry', eyebrow: 'SEE CLEARLY · PART I · SY2', title: 'Follow the Formation Chain', paragraphs: [
    'Most choices have a history. By the time a behavior becomes visible, several things may already have happened inside us. We see or interpret a moment, come to believe something about it, expect something to follow, and begin to want or avoid an outcome.',
    'Desire can become intention, intention can shape a choice, and repeated choices become part of how we live. You do not need to dissect every moment. Here you will practice noticing a process that often begins before the behavior anyone else can see.',
  ] },
  { id: 'chain', eyebrow: 'THE MOVEMENT BENEATH A CHOICE', title: 'The formation chain', paragraphs: [
    'Each link influences the next without making the next inevitable. The chain helps you notice where a response began to take shape. A link may be uncertain or missing; the purpose is attention, not a perfect account of yourself.',
  ] },
  { id: 'example', eyebrow: 'AN ORDINARY MOMENT', title: 'How one meaning can travel', paragraphs: [
    'Someone does not respond to my message. I might see that as “They are ignoring me,” believe “I am not important to them,” and expect they do not want to deal with me. Wanting reassurance, I may intend to get an answer, send another message or become cold, and find that the relationship feels more tense.',
    'This is an example, not an interpretation of you. The other person may have been busy, and any link in my account could be wrong or incomplete. A different first meaning could lead somewhere else.',
  ] },
  { id: 'trace', eyebrow: 'YOUR MOMENT', title: 'Trace one real moment', paragraphs: [
    'Choose a recent moment you can look at without forcing certainty. If you saved a moment in SY1, you may use it as a starting reference. You may also choose a different moment. Your words here belong to this trace; the earlier moment will not supply conclusions for you.',
    'Follow the links one at a time. Leave a link open when you do not know, or continue without saving a trace at all.',
  ] },
  { id: 'distinction', eyebrow: 'A USEFUL DISTINCTION', title: 'Belief and desire are different', paragraphs: [
    'Belief is what I think is true. Desire is what I want in response to what I think is true. If I believe “This is going badly,” I might desire to regain control. Naming both helps me see why a choice seemed appealing without pretending either one was certain.',
  ] },
  { id: 'reflection', eyebrow: 'YOUR REFLECTION', title: 'What became clearer?', paragraphs: [
    'What became clearer when you followed the reaction backward? You may keep a thought here or continue without writing.',
  ] },
  { id: 'practice', eyebrow: 'IN YOUR DAY', title: 'Notice a chain as it forms', paragraphs: [
    'Trace one full chain from a real moment. In two other moments, notice just a few links. There is nothing further to enter here; you are learning to recognize the movement in ordinary life.',
  ] },
  { id: 'carry-forward', eyebrow: 'CARRY FORWARD', title: 'Behavior has a beginning', paragraphs: [
    'Behavior is often the visible end of a deeper process. The point is not endless self-analysis. It is learning to notice where the chain begins shaping how you live. As you continue, the next movement will look more closely at the story you learned to tell about yourself.',
  ] },
];
