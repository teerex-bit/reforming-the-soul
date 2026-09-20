export function assertNoLiveAiCredentials(env: NodeJS.ProcessEnv = process.env) {
  if (env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY must be unset during ordinary automated tests.');
  }
}
