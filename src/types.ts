/**
 * Built-in detector identifiers.
 */
export type DetectorName =
  | 'api_keys'
  | 'jwt'
  | 'bearer_tokens'
  | 'pii_email'
  | 'pii_phone'
  | 'pii_ssn'
  | 'pii_credit_card'
  | 'ip_address'
  | 'private_key'
  | 'connection_string'
  | 'env_variable'
  | 'high_entropy';

export type ReplacementStrategy = 'placeholder' | 'semantic' | 'tokenize';

export type PolicyAction = 'block' | 'warn' | 'redact';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface DetectionMatch {
  type: DetectorName | string;
  value: string;
  start: number;
  end: number;
  severity: Severity;
}

export interface DetectionEvent extends DetectionMatch {
  replacedWith: string;
  timestamp: number;
}

export interface AuditReport {
  original: string;
  sanitized: string;
  detections: DetectionMatch[];
  riskScore: number;
  detectorsCalled: DetectorName[];
}

export interface WallContext {
  tokenMap: Map<string, string>;
  createdAt: number;
}

export interface WallPolicy {
  [detectorName: string]: PolicyAction;
  default: PolicyAction;
}

export interface CustomRule {
  name: string;
  pattern: RegExp | ((text: string) => DetectionMatch[]);
  severity: Severity;
  replace?: string | ((match: string) => string);
}

export interface WallConfig {
  strategy?: ReplacementStrategy;
  detectors?: DetectorName[];
  customRules?: CustomRule[];
  onDetect?: (event: DetectionEvent) => void;
  strict?: boolean;
}

export type PromptWallOptions = WallConfig;

export interface SanitizeResult {
  text: string;
  detections: DetectionMatch[];
  events: DetectionEvent[];
  context?: WallContext;
}

/**
 * Error thrown by `policywall` when a `block` action is triggered.
 */
export class WallPolicyError extends Error {
  public readonly detections: DetectionMatch[];

  constructor(message: string, detections: DetectionMatch[]) {
    super(message);
    this.name = 'WallPolicyError';
    this.detections = detections;
    Object.setPrototypeOf(this, WallPolicyError.prototype);
  }
}

/**
 * Internal: a detector inspects a string and returns raw matches.
 */
export interface Detector {
  name: DetectorName | string;
  detect: (text: string) => DetectionMatch[];
}

/**
 * Internal: a replacer maps a single match into a replacement string.
 * For tokenizer, it also has access to the shared context.
 */
export interface Replacer {
  strategy: ReplacementStrategy;
  replace: (match: DetectionMatch, context?: WallContext) => string;
}
