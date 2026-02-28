import { describe, it, expect } from 'vitest';
import { TimezoneHelper } from '../src/timezone.js';

describe('TimezoneHelper', () => {
  const tz = new TimezoneHelper();

  describe('detectTimezone()', () => {
    it('returns a non-empty IANA timezone string', () => {
      const result = tz.detectTimezone();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // IANA timezones contain a slash (e.g., "America/New_York", "Europe/London")
      // or are "UTC"
      expect(result.includes('/') || result === 'UTC').toBe(true);
    });
  });

  describe('convert()', () => {
    it('converts between timezones', () => {
      // UTC noon → should produce a valid date string in America/New_York
      const result = tz.convert('2025-06-15T12:00:00Z', 'UTC', 'America/New_York');
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
      // In June (EDT, UTC-4), noon UTC = 8:00 AM Eastern
      expect(result).toContain('08:00:00');
    });

    it('handles same timezone conversion', () => {
      const result = tz.convert('2025-01-15T10:00:00Z', 'UTC', 'UTC');
      expect(result).toContain('10:00:00');
    });
  });

  describe('toLocal()', () => {
    it('converts a UTC date to local timezone', () => {
      const result = tz.toLocal('2025-01-15T10:00:00Z', 'UTC');
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
    });

    it('defaults storeTz to UTC', () => {
      const result = tz.toLocal('2025-06-15T12:00:00Z');
      expect(result).toBeTruthy();
    });
  });
});
