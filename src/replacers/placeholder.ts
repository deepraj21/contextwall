import type { DetectionMatch, Replacer } from '../types.js';

const PLACEHOLDERS: Record<string, string> = {
  api_keys: '[API_KEY]',
  jwt: '[JWT_TOKEN]',
  bearer_tokens: '[BEARER_TOKEN]',
  pii_email: '[EMAIL]',
  pii_phone: '[PHONE]',
  pii_ssn: '[SSN]',
  pii_credit_card: '[CREDIT_CARD]',
  ip_address: '[IP_ADDRESS]',
  private_key: '[PRIVATE_KEY]',
  connection_string: '[CONNECTION_STRING]',
  env_variable: '[ENV_VAR]',
  high_entropy: '[SECRET]',
};

export const placeholderReplacer: Replacer = {
  strategy: 'placeholder',
  replace: (m: DetectionMatch): string => {
    const key = String(m.type);
    return PLACEHOLDERS[key] ?? '[REDACTED]';
  },
};
