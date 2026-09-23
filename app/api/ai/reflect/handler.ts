import { AuthenticationRequiredError } from '../../../../server/auth/require-actor';
import { isSameOriginRequest } from '../../../../server/http/same-origin';
import { reflectOnCurrentEntry } from '../../../../server/services/ai-reflect-service';

type RouteDependencies = Readonly<{ reflect?: typeof reflectOnCurrentEntry }>;
const headers = { 'cache-control': 'no-store', 'content-type': 'application/json' };

export async function handleAiReflectPost(request: Request, dependencies: RouteDependencies = {}) {
  try {
    const body = await request.json() as { intentId: string };
    if (!body || typeof body !== 'object' || Object.keys(body).some(key => key !== 'intentId')) {
      return new Response(JSON.stringify({ kind: 'invalid_request' }), { status: 400, headers });
    }
    if (!isSameOriginRequest(request)) {
      return new Response(JSON.stringify({ kind: 'forbidden' }), { status: 403, headers });
    }
    const result = await (dependencies.reflect ?? reflectOnCurrentEntry)(body);
    return new Response(JSON.stringify(result), { status: result.kind === 'unavailable' ? 404 : 200, headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return new Response(JSON.stringify({ kind: 'unauthorized' }), { status: 401, headers });
    if (error && typeof error === 'object' && 'code' in error && ['23514', '40001'].includes(String(error.code))) {
      return new Response(JSON.stringify({ kind: 'conflict' }), { status: 409, headers });
    }
    if (error instanceof SyntaxError || (error instanceof Error && /intentId|unsupported field/.test(error.message))) {
      return new Response(JSON.stringify({ kind: 'invalid_request' }), { status: 400, headers });
    }
    return new Response(JSON.stringify({ kind: 'provider_error', retryable: false }), { status: 500, headers });
  }
}
