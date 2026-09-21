import { createHash } from 'node:crypto';
import { REFLECT_VERSIONS } from '../ai/context-builder';
import { configuredAiProvider, type AiProvider } from '../ai/openai-adapter';
import { runReflect } from '../ai/orchestrator';
import { requireActor } from '../auth/require-actor';
import { aiReflectRepository, type AiReflectRepository, type AiTerminalStatus } from '../data/ai-reflect-repository';

type ActorClient = Parameters<typeof requireActor>[0];
type ReflectInput = Readonly<{ intentId: string }>;
export type { AiReflectRepository } from '../data/ai-reflect-repository';

function validateInput(value: ReflectInput) {
  const extras = Object.keys(value).filter(key => key !== 'intentId');
  if (extras.length) throw new Error(`AI Reflect request contains unsupported field: ${extras.join(', ')}`);
  if (typeof value.intentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.intentId)) {
    throw new Error('AI Reflect intentId must be a UUID.');
  }
}

export function currentReflectFingerprint() {
  return createHash('sha256').update(JSON.stringify({ mode: 'reflect', stage: 'awaken', node: 'awaken.pay-attention.reflect', ...REFLECT_VERSIONS })).digest('hex');
}

export async function reflectOnCurrentEntry(
  input: ReflectInput,
  dependencies: Readonly<{ repository?: AiReflectRepository; provider?: AiProvider; actorClient?: ActorClient; now?: () => number }> = {},
) {
  validateInput(input);
  const actor = await requireActor(dependencies.actorClient, input);
  const repository = dependencies.repository ?? aiReflectRepository();
  const reservation = await repository.reserve({ actorId: actor.id, intentId: input.intentId,
    requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS });
  if (reservation.kind !== 'dispatch') return reservation;

  const provider = dependencies.provider ?? configuredAiProvider();
  const now = dependencies.now ?? Date.now;
  const started = now();
  const result = await runReflect(reservation.context, provider);
  await repository.complete({ actorId: actor.id, threadId: reservation.threadId,
    status: result.kind as AiTerminalStatus, durationMs: Math.max(0, now() - started) });
  return { ...result, threadId: reservation.threadId };
}

export async function saveConfirmedReflectInsight(
  input: Readonly<{ threadId: string | null; insightText: string }>,
  dependencies: Readonly<{ repository?: AiReflectRepository; actorClient?: ActorClient }> = {},
) {
  if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['threadId', 'insightText'].includes(key))) {
    throw new Error('Confirmed insight contains an unsupported field.');
  }
  if (typeof input.insightText !== 'string' || input.insightText.trim().length === 0) throw new Error('insight text is required.');
  if (input.threadId !== null && (typeof input.threadId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.threadId))) throw new Error('threadId is invalid.');
  const actor = await requireActor(dependencies.actorClient, input);
  return (dependencies.repository ?? aiReflectRepository()).saveInsight({
    actorId: actor.id, threadId: input.threadId, insightText: input.insightText,
  });
}
