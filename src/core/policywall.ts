import type { PolicyAction, WallConfig, WallPolicy } from '../types.js';
import { WallPolicyError } from '../types.js';
import { runWall, applyReplacements } from './engine.js';
import { getReplacer } from '../replacers/index.js';

const DEFAULT_ACTION: PolicyAction = 'redact';

function actionFor(policy: WallPolicy, type: string): PolicyAction {
  if (Object.prototype.hasOwnProperty.call(policy, type)) {
    const value = policy[type];
    if (value !== undefined) return value;
  }
  return policy.default ?? DEFAULT_ACTION;
}

/**
 * Apply a per-detector policy to a string. For each detection:
 *   - `block`  -> throw WallPolicyError including the offending detections
 *   - `warn`   -> console.warn and leave the value in place
 *   - `redact` -> replace using the configured strategy (default placeholder)
 *
 * If multiple detections trigger `block`, all of them are reported on the
 * single thrown error.
 */
export function policywall(
  text: string,
  policy: WallPolicy,
  options: WallConfig = {},
): string {
  const result = runWall(text, options, { dryRun: true });

  const blocked = result.detections.filter((d) => actionFor(policy, String(d.type)) === 'block');
  if (blocked.length > 0) {
    const types = Array.from(new Set(blocked.map((b) => String(b.type)))).join(', ');
    throw new WallPolicyError(`Blocked: ${types} detected`, blocked);
  }

  for (const d of result.detections) {
    if (actionFor(policy, String(d.type)) === 'warn') {
      console.warn(`[contextwall] ${String(d.type)} detected (length=${d.value.length})`);
    }
  }

  const toRedact = result.detections.filter(
    (d) => actionFor(policy, String(d.type)) === 'redact',
  );
  if (toRedact.length === 0) return text;

  const replacer = getReplacer(options.strategy ?? 'placeholder');
  const built = applyReplacements(text, toRedact, (m) => replacer.replace(m));
  return built.text;
}
