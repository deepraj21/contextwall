import type { DetectionMatch, Replacer } from '../types.js';

const STUB_PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nEXAMPLE_KEY_REDACTED\n-----END PRIVATE KEY-----';

const STUB_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJleGFtcGxlIn0.EXAMPLE_SIGNATURE';

const SEMANTIC_FAKES: Record<string, string> = {
  api_keys: 'sk_test_EXAMPLE000',
  jwt: STUB_JWT,
  bearer_tokens: 'Bearer EXAMPLE_TOKEN_000',
  pii_email: 'user@example.com',
  pii_phone: '+1-555-0100',
  pii_ssn: '000-00-0000',
  pii_credit_card: '4111 1111 1111 1111',
  private_key: STUB_PRIVATE_KEY,
  connection_string: 'postgresql://user:password@db.example.com:5432/example',
  env_variable: 'EXAMPLE_VAR="REDACTED"',
  high_entropy: 'EXAMPLE_VALUE_REDACTED',
};

function fakeIp(value: string): string {
  if (value.includes(':')) return '2001:db8::1';
  return '203.0.113.1';
}

export const semanticReplacer: Replacer = {
  strategy: 'semantic',
  replace: (m: DetectionMatch): string => {
    const key = String(m.type);
    if (key === 'ip_address') return fakeIp(m.value);
    return SEMANTIC_FAKES[key] ?? '[REDACTED]';
  },
};
