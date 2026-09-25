export type SC1SectionId = 'entry' | 'teaching' | 'contrast' | 'interaction' | 'reflection' | 'practice' | 'carry-forward';
export type SC1Section = Readonly<{
  id: SC1SectionId;
  eyebrow: string;
  title: string;
  paragraphs: readonly string[];
}>;

export const SC1_SECTIONS: readonly SC1Section[] = [
  { id: 'entry', eyebrow: 'SEE CLEARLY · PART I · SC1', title: 'Facts and Interpretation', paragraphs: [
    'A moment happens, and meaning often arrives almost at once. You may notice a look, a pause, or a change in someone’s voice and feel certain you know what it means. Seeing clearly begins by giving those two things their own names: what happened and the meaning you gave it.',
    'You do not need to prove your first interpretation wrong. It may be accurate, partly accurate, or uncertain. For now, the useful step is to notice that an interpretation has joined the event, because we can respond to both without realizing it.',
  ] },
  { id: 'teaching', eyebrow: 'HOW A LENS WORKS', title: 'The meaning can feel like the event', paragraphs: [
    'We learn to make sense of life through experience. Family, church, culture, authority, pain, success, failure, and repeated choices can shape what we expect a moment to mean. When a familiar situation appears, the interpretation may come so quickly that it feels like an observable fact.',
    'Imagine sending a message and seeing that it has been read without a reply. The fact is that no reply has arrived yet. “I must have upset them” may be the meaning that immediately comes to mind. It could be true, or there could be another reason for the delay; the point is to recognize where observation ended and interpretation began.',
    'This is an invitation to be honest, not to dismiss your perception. You can take your feelings seriously while keeping room to ask what you actually know. Separating the two gives you space before you decide what to do next.',
  ] },
  { id: 'contrast', eyebrow: 'LOOK AT AN ORDINARY MOMENT', title: 'The same event, more than one meaning', paragraphs: [
    'You walk into a room and two people stop talking. Their silence is something a careful witness could describe. “They were talking about me” may arrive just as quickly, but it names a conclusion about their silence, not something you could see or hear directly.',
    'The conclusion might be right. You do not need to replace it with a cheerful guess. Notice how the same observable moment leaves more than one possible explanation open, then carry that distinction into a moment of your own.',
  ] },
  { id: 'interaction', eyebrow: 'YOUR MOMENT', title: 'Separate what happened from what it meant', paragraphs: [
    'Choose one recent, ordinary moment that you can describe without needing to solve it. First write what a careful witness could have observed. Then write the meaning that came to you automatically, even if you are still unsure whether it was accurate.',
    'You may connect an earlier Awaken entry if one is available, or use a new moment. These are your words. Saving keeps the two parts separate so you can return to them; the app will not decide what another person intended.',
  ] },
  { id: 'reflection', eyebrow: 'YOUR REFLECTION', title: 'Notice the space between them', paragraphs: [
    'Look at the fact and the meaning you wrote. Did the interpretation arrive so quickly that it seemed inseparable from the event? If you want to keep a thought about that difference, write it here. You can also continue without writing.',
  ] },
  { id: 'practice', eyebrow: 'IN YOUR DAY', title: 'Pause before the meaning settles', paragraphs: [
    'During the next few days, choose one small moment when you feel an immediate reaction. Name what you could verify, then name the meaning that appeared. You do not have to argue with that meaning or invent a better one; simply notice both before you choose a response.',
  ] },
  { id: 'carry-forward', eyebrow: 'CARRY FORWARD', title: 'Keep the two distinct', paragraphs: [
    'You have practiced seeing an event and your interpretation as related but distinct. The meaning may matter, and it may still need to be tested. In the next See Clearly movement, you will follow how a meaning can connect with belief, expectation, desire, intention, choice, and outcome.',
  ] },
];
