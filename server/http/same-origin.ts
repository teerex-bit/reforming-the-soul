export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    const incoming = new URL(origin);
    const runtime = new URL(request.url);
    const host = request.headers.get('host') ?? runtime.host;
    return incoming.protocol === runtime.protocol && incoming.host === host;
  } catch {
    return false;
  }
}
