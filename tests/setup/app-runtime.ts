const appRuntimeBaseUrl = process.env.RTS_APP_BASE_URL ?? 'http://localhost:4187';

export function appRuntimeUrl(path: string) {
  return new URL(path, appRuntimeBaseUrl).toString();
}
