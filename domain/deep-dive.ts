export type A1SectionId = 'entry' | 'moment' | 'outside-inside' | 'teaching' | 'scripture' | 'reflection' | 'go-deeper' | 'practice' | 'carry-forward';
export type DeepDiveModuleId = 'awaken.pay-attention' | 'awaken.catch-yourself-being-you';
export type DeepDivePromptId = 'real-moment' | 'first-response';
export const A1_MODULE_ID: DeepDiveModuleId = 'awaken.pay-attention';
export const A1_REFLECTION_PROMPT_ID: DeepDivePromptId = 'real-moment';
export const A2_MODULE_ID: DeepDiveModuleId = 'awaken.catch-yourself-being-you';
export const A2_REFLECTION_PROMPT_ID: DeepDivePromptId = 'first-response';

export type DeepDiveProgress = Readonly<{ id: string; lastSectionId: string; completedAt: string | null; reflection: string | null }>;
