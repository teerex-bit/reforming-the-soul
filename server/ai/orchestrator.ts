import { buildReflectRequest, type CurrentReflectContext } from './context-builder';
import type { AiProvider } from './openai-adapter';

export async function runReflect(context: CurrentReflectContext, provider: AiProvider) {
  const result = await provider.respond(buildReflectRequest(context));
  return result;
}
