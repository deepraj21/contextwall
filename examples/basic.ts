import { promptwall, auditwall, createwall } from '../src/index.js';

const raw = 'Use sk_live_abcdef0123 and email john@example.com';

const clean = promptwall(raw);
console.log('clean:', clean);

const report = auditwall(raw);
console.log('audit:', report);

const teamWall = createwall({
  strategy: 'semantic',
  detectors: ['api_keys', 'pii_email', 'jwt'],
});
console.log('team wall:', teamWall(raw));
