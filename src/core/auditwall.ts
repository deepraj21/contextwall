import type { AuditReport, WallConfig } from '../types.js';
import { runWall, computeRiskScore } from './engine.js';

/**
 * Dry-run sanitizer. Reports what *would* be redacted without modifying the
 * input string.
 *
 * Returns a structured `AuditReport` including a 0-100 `riskScore` derived
 * from the severity of each detection.
 */
export function auditwall(text: string, options: WallConfig = {}): AuditReport {
  const result = runWall(text, options, { dryRun: true });

  const previewOptions: WallConfig = { ...options };
  if (!previewOptions.strategy) previewOptions.strategy = 'placeholder';
  const sanitizedRun = runWall(text, previewOptions);

  return {
    original: text,
    sanitized: sanitizedRun.text,
    detections: result.detections,
    riskScore: computeRiskScore(result.detections),
    detectorsCalled: result.detectorsCalled,
  };
}
