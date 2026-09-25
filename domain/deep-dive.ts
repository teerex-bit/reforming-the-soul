export type A1SectionId = 'entry' | 'moment' | 'outside-inside' | 'teaching' | 'scripture' | 'reflection' | 'go-deeper' | 'practice' | 'carry-forward';
export type DeepDiveModuleId = 'awaken.pay-attention' | 'awaken.catch-yourself-being-you' | 'awaken.your-reactions-have-a-history' | 'awaken.formation-is-not-identity';
export type DeepDivePromptId = 'real-moment' | 'first-response' | 'formation-history' | 'formation-and-identity';
export const A1_MODULE_ID: DeepDiveModuleId = 'awaken.pay-attention';
export const A1_REFLECTION_PROMPT_ID: DeepDivePromptId = 'real-moment';
export const A2_MODULE_ID: DeepDiveModuleId = 'awaken.catch-yourself-being-you';
export const A2_REFLECTION_PROMPT_ID: DeepDivePromptId = 'first-response';
export const A3_MODULE_ID: DeepDiveModuleId = 'awaken.your-reactions-have-a-history';
export const A3_REFLECTION_PROMPT_ID: DeepDivePromptId = 'formation-history';
export const A4_MODULE_ID: DeepDiveModuleId = 'awaken.formation-is-not-identity';
export const A4_REFLECTION_PROMPT_ID: DeepDivePromptId = 'formation-and-identity';

export type DeepDiveProgress = Readonly<{ id: string; lastSectionId: string; completedAt: string | null; reflection: string | null }>;
