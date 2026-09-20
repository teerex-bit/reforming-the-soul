export type FakeAiRequest = Readonly<{ mode: string; input: string }>;
export type FakeAiResult = Readonly<
  | { kind: 'success'; text: string }
  | { kind: 'refusal'; safeMessage: string }
  | { kind: 'incomplete'; reason: string }
  | { kind: 'invalid'; issues: readonly string[] }
  | { kind: 'timeout' }
  | { kind: 'provider_error'; retryable: boolean }
>;

export function createFakeAiProvider(fixtures: readonly FakeAiResult[]) {
  const queue = [...fixtures];
  const requests: FakeAiRequest[] = [];
  return {
    requests,
    async respond(request: FakeAiRequest): Promise<FakeAiResult> {
      requests.push(Object.freeze({ ...request }));
      const result = queue.shift();
      if (!result) throw new Error('No fake AI fixture remains for this request.');
      return structuredClone(result);
    },
  };
}
