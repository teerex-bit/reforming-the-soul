const appRuntimeBaseUrl = process.env.RTS_APP_BASE_URL ?? 'http://127.0.0.1:4187';

export function appRuntimeUrl(path: string) {
  return new URL(path, appRuntimeBaseUrl).toString();
}
