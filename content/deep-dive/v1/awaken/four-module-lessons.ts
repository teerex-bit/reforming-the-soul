export type NewAwakenSectionId = 'entry' | 'teaching' | 'trace' | 'reframe' | 'reflection' | 'practice' | 'carry-forward';
export type NewAwakenSection = Readonly<{ id: NewAwakenSectionId; eyebrow: string; title: string; paragraphs: readonly string[]; prompt?: string }>;

export const A3_SECTIONS: readonly NewAwakenSection[] = [
  { id: 'entry', eyebrow: 'AWAKEN · A3', title: 'Your Reactions Have a History', paragraphs: [
    'In the last lesson, you may have noticed a response that appears in more than one situation. You do not need to remember a perfect example or recover a map of every moment. Choose one response you recognize and hold it gently as you read.',
    'A response can become familiar long before we know how to describe it. When it appears again, we can pause and ask how it may have learned to make sense. The question invites curiosity, not a verdict about your past.',
  ] },
  { id: 'teaching', eyebrow: 'HOW A RESPONSE FORMS', title: 'What once made sense', paragraphs: [
    'Our responses can be learned through repeated experiences, modeled by people around us, taught directly, rewarded, or chosen because they seemed to help. A response that once offered a little safety or predictability may begin to happen automatically. That history does not make every present response wise, but it helps explain why change can require more than deciding to act differently.',
    'A person who learned that conflict usually became explosive may have discovered that going quiet kept things from getting worse. Years later, the same withdrawal may appear even when the present relationship is safe enough for honest conversation. This example does not tell you where your own response came from; only you can consider what fits, and “I’m not sure” is a truthful answer.',
    'Recognizing a history does not assign blame to someone else or excuse harm we may have caused. It gives us a way to notice what was formed without pretending we know every cause. We can take responsibility for what we do now while remaining honest about how a response developed.',
  ] },
  { id: 'trace', eyebrow: 'TRACE A THREAD', title: 'What might have shaped it?', paragraphs: [
    'Begin with one recurring response you actually recognize. Consider a possible source, then what the response may once have helped you accomplish, protect, or avoid. You may choose “I’m not sure” at any point, and nothing in this working thread is saved or interpreted for you.',
  ] },
  { id: 'reflection', eyebrow: 'YOUR REFLECTION', title: 'What are you beginning to see?', paragraphs: [
    'Where might this response have learned to make sense, and what might it once have helped you accomplish, protect, or avoid? Write only what you want to keep. You can also continue without writing or without knowing the answer.',
  ], prompt: 'Where might this response have learned to make sense? What might it once have helped you accomplish, protect, or avoid?' },
  { id: 'practice', eyebrow: 'IN YOUR DAY', title: 'Notice one possible connection', paragraphs: [
    'When a familiar response appears this week, name it without rushing to explain it. If a possible source comes to mind, you can hold that possibility lightly and ask what the response may have helped with before. “I’m not sure” remains a valid place to stop.',
  ] },
  { id: 'carry-forward', eyebrow: 'CARRY FORWARD', title: 'A response can have a history', paragraphs: [
    'You have noticed a response and considered how it may have been formed. You do not need to prove its origin to keep paying attention. In the next lesson, you will consider why what was formed in you is not the whole truth of who you are.',
  ] },
];

export const A4_SECTIONS: readonly NewAwakenSection[] = [
  { id: 'entry', eyebrow: 'AWAKEN · A4', title: 'Formation Is Not Identity', paragraphs: [
    'What formed you is not the same thing as who you are. A learned response can influence what you do, what you expect, and how you feel in a moment. It may still be active in you without defining your identity or deciding your future.',
    'It is easy to turn a familiar pattern into a name for ourselves: “I’m just controlling,” “I’m bad at conflict,” or “I’m just this way.” Those statements may point to something real we need to face, but they say more than a pattern can tell us. A response is something to recognize and bring into the light, not the whole truth of a person.',
  ] },
  { id: 'teaching', eyebrow: 'NEW LIFE AND CONTINUING CHANGE', title: 'Made new, still being formed', paragraphs: [
    'The curriculum’s new-creation promise gives us a different place to begin: in Christ, we are not trapped inside the patterns we learned. Being made new does not mean every thought, emotion, bodily response, habit, relationship pattern, and desire was retrained instantly. Discovering old formation does not cancel what happened in Christ; it shows where the work of transformation can continue.',
    'Change reaches deeper than managing outward behavior. As we learn to notice an automatic response, we can bring it to God and practice a different way of living over time. We do not need to deny the pattern to believe that change is possible.',
  ] },
  { id: 'reframe', eyebrow: 'SEPARATE THE TWO', title: 'A pattern is not a name', paragraphs: [
    'Choose one familiar response and put it into words. “I am controlling” can become “I learned to move toward control when I feel uncertain.” This change in language does not excuse the response; it makes room to recognize what was formed without turning it into identity.',
  ] },
  { id: 'reflection', eyebrow: 'YOUR REFLECTION', title: 'What have you called yourself?', paragraphs: [
    'Which pattern have you been treating as “just who I am”? If you have already seen a small sign that change is possible, you may name it too. Write only what feels useful to keep.',
  ], prompt: 'Which pattern have you been treating as “just who I am”? What would you say about it now?' },
  { id: 'practice', eyebrow: 'IN YOUR DAY', title: 'Notice without forcing an answer', paragraphs: [
    'When a familiar response appears, notice and name what is happening without judging your identity by it. If you want to, ask God what He wants you to see and stay with what becomes clear. You can stop at noticing; neither asking nor receiving requires an immediate answer.',
  ] },
  { id: 'carry-forward', eyebrow: 'CARRY FORWARD', title: 'Ready to see clearly', paragraphs: [
    'You can notice an internal response, recognize a recurring pattern, and consider that it has a history. What was formed in you is real, but it is not the whole truth of who you are. You can bring what you notice to God without forcing an interpretation.',
    'Awaken ends here. In See Clearly, you will look more closely at what you believe about yourself and God, and ask what is actually true.',
  ] },
];
