import { describe, expect, it, vi } from 'vitest';
import { logwall } from '../src/index.js';

describe('logwall', () => {
  it('invokes logger for every detection', () => {
    const logger = vi.fn();
    logwall('sk_live_abcdef0123 and me@example.com', { logger });
    expect(logger).toHaveBeenCalledTimes(2);
    const event = logger.mock.calls[0]?.[0];
    expect(event).toMatchObject({ replacedWith: expect.any(String), timestamp: expect.any(Number) });
  });

  it('does nothing when no logger provided (no console output)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = logwall('sk_live_abcdef0123');
    expect(out).toContain('[API_KEY]');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('still triggers user onDetect alongside logger', () => {
    const logger = vi.fn();
    const onDetect = vi.fn();
    logwall('sk_live_abcdef0123', { logger, onDetect });
    expect(logger).toHaveBeenCalledTimes(1);
    expect(onDetect).toHaveBeenCalledTimes(1);
  });
});
