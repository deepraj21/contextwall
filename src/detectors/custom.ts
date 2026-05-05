import type { CustomRule, DetectionMatch } from '../types.js';

/**
 * Run user-supplied custom rules.
 *
 * Each rule's `pattern` may be a RegExp (global flag is auto-applied) or a
 * function returning DetectionMatch[]. The rule's `name` becomes the match's
 * `type`, and the rule's severity is propagated.
 */
export function runCustomRules(text: string, rules: CustomRule[]): DetectionMatch[] {
  const out: DetectionMatch[] = [];
  for (const rule of rules) {
    if (typeof rule.pattern === 'function') {
      const matches = rule.pattern(text);
      for (const m of matches) {
        out.push({ ...m, type: rule.name, severity: rule.severity });
      }
      continue;
    }
    const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g';
    const re = new RegExp(rule.pattern.source, flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = m[0];
      if (m.index === re.lastIndex) re.lastIndex++;
      out.push({
        type: rule.name,
        value,
        start: m.index,
        end: m.index + value.length,
        severity: rule.severity,
      });
    }
  }
  return out;
}
