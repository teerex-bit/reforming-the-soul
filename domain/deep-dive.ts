export type A1SectionId = 'entry' | 'moment' | 'outside-inside' | 'teaching' | 'scripture' | 'reflection' | 'go-deeper' | 'practice' | 'carry-forward';
export type DeepDiveProgress = Readonly<{ id: string; lastSectionId: A1SectionId; completedAt: string | null; reflection: string | null }>;
