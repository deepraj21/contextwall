import { describe, expect, it } from 'vitest';
import { promptwall, auditwall } from '../src/index.js';
import { isLuhnValid, isValidIpv4, isJwtShape } from '../src/detectors/patterns.js';

function detectionTypes(text: string): string[] {
  return auditwall(text).detections.map((d) => String(d.type));
}

describe('built-in patterns', () => {
  describe('api_keys', () => {
    it('catches Stripe-style sk_live_*', () => {
      expect(detectionTypes('sk_live_abcd1234efgh')).toContain('api_keys');
    });
    it('catches AWS AKIA keys', () => {
      expect(detectionTypes('AKIAIOSFODNN7EXAMPLE')).toContain('api_keys');
    });
    it('catches GitHub PATs', () => {
      expect(detectionTypes('ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toContain('api_keys');
    });
    it('catches HuggingFace hf_ tokens', () => {
      expect(detectionTypes('token: hf_abcdefghijklmnopqrstuvwx')).toContain('api_keys');
    });
    it('does not flag plain words', () => {
      expect(detectionTypes('this is just text')).not.toContain('api_keys');
    });
  });

  describe('jwt', () => {
    it('catches valid-shaped JWT', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef123';
      expect(detectionTypes(jwt)).toContain('jwt');
    });
    it('rejects strings that look like JWTs but are not', () => {
      expect(isJwtShape('eyJxxx.bbbbb.ccccc')).toBe(false);
    });
  });

  describe('bearer_tokens', () => {
    it('catches Authorization: Bearer ...', () => {
      const out = promptwall('Authorization: Bearer abcdef0123456789xyz');
      expect(out).toContain('[BEARER_TOKEN]');
    });
  });

  describe('pii_email', () => {
    it('catches valid emails', () => {
      expect(detectionTypes('contact me at jane.doe+spam@acme.co.uk')).toContain('pii_email');
    });
    it('does not catch random @ in code', () => {
      expect(detectionTypes('the symbol @ is special')).not.toContain('pii_email');
    });
  });

  describe('pii_ssn', () => {
    it('catches valid US SSN', () => {
      expect(detectionTypes('SSN: 123-45-6789')).toContain('pii_ssn');
    });
    it('rejects invalid SSN with 000 area', () => {
      expect(detectionTypes('SSN: 000-12-3456')).not.toContain('pii_ssn');
    });
  });

  describe('pii_credit_card', () => {
    it('catches Luhn-valid credit card', () => {
      expect(detectionTypes('card 4111 1111 1111 1111 in file')).toContain('pii_credit_card');
    });
    it('rejects Luhn-invalid sequence', () => {
      expect(detectionTypes('card 4111 1111 1111 1112 here')).not.toContain('pii_credit_card');
    });
  });

  describe('ip_address', () => {
    it('catches IPv4', () => {
      expect(detectionTypes('connect 10.0.0.1 now')).toContain('ip_address');
    });
    it('rejects out-of-range octets', () => {
      expect(isValidIpv4('999.0.0.1')).toBe(false);
    });
    it('rejects leading zeros', () => {
      expect(isValidIpv4('01.0.0.1')).toBe(false);
    });
    it('catches IPv6', () => {
      expect(detectionTypes('host 2001:db8::1234 there')).toContain('ip_address');
    });
  });

  describe('private_key', () => {
    it('catches PEM private key block', () => {
      const pem = '-----BEGIN RSA PRIVATE KEY-----\nAAAA\nBBBB\n-----END RSA PRIVATE KEY-----';
      expect(detectionTypes(pem)).toContain('private_key');
    });
  });

  describe('connection_string', () => {
    it('catches mongodb URIs', () => {
      expect(
        detectionTypes('uri: mongodb://user:pass@db.example.com:27017/admin?ssl=true'),
      ).toContain('connection_string');
    });
    it('catches postgres URIs', () => {
      expect(detectionTypes('DATABASE_URL=postgresql://u:p@h:5432/d')).toContain(
        'connection_string',
      );
    });
  });

  describe('env_variable', () => {
    it('catches inline secret-style env assignments', () => {
      expect(detectionTypes('SECRET_KEY="abcd1234"')).toContain('env_variable');
    });
  });

  describe('Luhn', () => {
    it('validates known card', () => {
      expect(isLuhnValid('4111111111111111')).toBe(true);
    });
    it('rejects bad card', () => {
      expect(isLuhnValid('4111111111111112')).toBe(false);
    });
    it('rejects too-short input', () => {
      expect(isLuhnValid('1234')).toBe(false);
    });
  });
});
