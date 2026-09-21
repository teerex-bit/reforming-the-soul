import type { AiAdapterResult } from '../../domain/ai';
import { parseReflectOutput, type ReflectOutput } from './schemas';
import type { buildReflectRequest } from './context-builder';

export type ReflectProviderRequest = ReturnType<typeof buildReflectRequest>;
export interface AiProvider { respond(request: ReflectProviderRequest): Promise<AiAdapterResult<ReflectOutput>> }

type Fetch = typeof fetch;

function providerPayload(payload: ReflectProviderRequest) {
  return {
    model: payload.model, store: false,
    input: payload.input.map(block => ({
      role: block.label.endsWith('_USER_ENTRY_UNTRUSTED_DATA') ? 'user' : 'developer',
      content: [{ type: 'input_text', text: `[${block.label}]\n${typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}` }],
    })),
    text: payload.text,
  };
}

export function openAiProvider(options: Readonly<{ apiKey?: string; fetch?: Fetch; timeoutMs?: number }> = {}): AiProvider {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const request = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  return {
    async respond(payload) {
      if (!apiKey) return { kind: 'provider_error', retryable: false };
      try {
        const response = await request('https://api.openai.com/v1/responses', {
          method: 'POST', signal: AbortSignal.timeout(timeoutMs),
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify(providerPayload(payload)),
        });
        if (!response.ok) return { kind: 'provider_error', retryable: response.status === 429 || response.status >= 500 };
        const data = await response.json() as Record<string, unknown>;
        if (data.status === 'incomplete') return { kind: 'incomplete', reason: String((data.incomplete_details as Record<string, unknown> | undefined)?.reason ?? 'unknown') };
        const refusal = (data.output as Array<Record<string, unknown>> | undefined)?.flatMap(item => item.content as Array<Record<string, unknown>> ?? []).find(item => item.type === 'refusal');
        if (refusal) return { kind: 'refusal', safeMessage: 'AI Reflect could not respond to this entry.' };
        const outputText = (data.output as Array<Record<string, unknown>> | undefined)
          ?.flatMap(item => item.content as Array<Record<string, unknown>> ?? [])
          .filter(item => item.type === 'output_text' && typeof item.text === 'string');
        if (outputText?.length !== 1) return { kind: 'invalid', issues: ['Provider returned no single strict structured output'] };
        try {
          return parseReflectOutput(JSON.parse(outputText[0].text as string), typeof data.id === 'string' ? data.id : null);
        } catch {
          return { kind: 'invalid', issues: ['Provider structured output was not valid JSON'] };
        }
      } catch (error) {
        if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return { kind: 'timeout' };
        return { kind: 'provider_error', retryable: true };
      }
    },
  };
}

export function configuredAiProvider(): AiProvider {
  if (process.env.RTS_TEST_MODE === '1' && process.env.AI_TEST_ADAPTER === 'fake') {
    return { respond: async () => parseReflectOutput({ questions: ['What did you notice just before your body responded?'] }) };
  }
  return openAiProvider();
}
