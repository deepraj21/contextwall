import { runDetectors, defaultDetectorSet } from '../detectors/index.js';
import { getReplacer } from '../replacers/index.js';
import type {
  DetectionEvent,
  DetectionMatch,
  DetectorName,
  Severity,
  WallConfig,
  WallContext,
} from '../types.js';

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Resolve overlapping matches.
 *
 * Sort by:
 *  1. start ascending
 *  2. (end - start) descending (longest first)
 *  3. severityRank descending (highest severity first)
 *
 * Then greedily keep matches that do not overlap an already-kept one.
 */
export function resolveOverlaps(matches: DetectionMatch[]): DetectionMatch[] {
  if (matches.length <= 1) return [...matches];

  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });

  const kept: DetectionMatch[] = [];
  let cursor = -1;
  for (const m of sorted) {
    if (m.start >= cursor) {
      kept.push(m);
      cursor = m.end;
    }
  }
  return kept;
}

/**
 * Apply replacements to text given resolved (non-overlapping) matches.
 * Matches must already be sorted by start ascending and non-overlapping.
 *
 * Returns the new string and the per-match replacement strings.
 */
export function applyReplacements(
  text: string,
  matches: DetectionMatch[],
  buildReplacement: (m: DetectionMatch) => string,
): { text: string; replacements: string[] } {
  if (matches.length === 0) return { text, replacements: [] };

  const ordered = [...matches].sort((a, b) => a.start - b.start);
  const out: string[] = [];
  const replacements: string[] = [];
  let cursor = 0;
  for (const m of ordered) {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    const rep = buildReplacement(m);
    out.push(rep);
    replacements.push(rep);
    cursor = m.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return { text: out.join(''), replacements };
}

export interface EngineResult {
  text: string;
  detections: DetectionMatch[];
  events: DetectionEvent[];
  context?: WallContext;
  detectorsCalled: DetectorName[];
}

export interface EngineRunOptions {
  /** When true, do not actually replace - just collect detections. */
  dryRun?: boolean;
}

/**
 * The single pipeline used by every public API.
 *
 * 1. Run detectors (built-in + custom)
 * 2. Resolve overlaps
 * 3. Apply replacer (or skip on dry-run)
 * 4. Emit DetectionEvent for each kept match
 */
export function runWall(
  text: string,
  config: WallConfig = {},
  options: EngineRunOptions = {},
): EngineResult {
  const strategy = config.strategy ?? 'placeholder';
  const detectorNames = config.detectors ?? defaultDetectorSet(config.strict ?? false);
  const customRules = config.customRules ?? [];

  const allMatches = runDetectors(text, detectorNames, customRules, config.strict ?? false);
  const resolved = resolveOverlaps(allMatches);

  const replacer = getReplacer(strategy);
  const context: WallContext | undefined =
    strategy === 'tokenize' ? { tokenMap: new Map(), createdAt: Date.now() } : undefined;

  const ts = Date.now();
  const events: DetectionEvent[] = [];

  let outText = text;
  if (!options.dryRun) {
    const built = applyReplacements(text, resolved, (m) => {
      const customRule = customRules.find((r) => r.name === m.type);
      if (customRule?.replace !== undefined) {
        return typeof customRule.replace === 'function'
          ? customRule.replace(m.value)
          : customRule.replace;
      }
      return replacer.replace(m, context);
    });
    outText = built.text;
    for (let i = 0; i < resolved.length; i++) {
      const m = resolved[i];
      const replacedWith = built.replacements[i];
      if (m === undefined || replacedWith === undefined) continue;
      const ev: DetectionEvent = { ...m, replacedWith, timestamp: ts };
      events.push(ev);
      if (config.onDetect) config.onDetect(ev);
    }
  } else {
    for (const m of resolved) {
      const ev: DetectionEvent = { ...m, replacedWith: '', timestamp: ts };
      events.push(ev);
      if (config.onDetect) config.onDetect(ev);
    }
  }

  return {
    text: outText,
    detections: resolved,
    events,
    context,
    detectorsCalled: detectorNames,
  };
}

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  low: 5,
  medium: 10,
  high: 20,
  critical: 30,
};

export function computeRiskScore(detections: DetectionMatch[]): number {
  if (detections.length === 0) return 0;
  let score = 0;
  for (const d of detections) score += SEVERITY_WEIGHTS[d.severity];
  return Math.min(100, score);
}
