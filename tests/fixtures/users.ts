const LOCAL_E2E_PASSWORD = 'local-e2e-only-password';

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

export function e2eUser(scenario: string, projectName: string) {
  return Object.freeze({
    email: `${safeSegment(scenario)}-${safeSegment(projectName)}@rts.test`,
    password: LOCAL_E2E_PASSWORD,
  });
}
