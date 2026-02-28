/**
 * Timezone utility for converting WooCommerce date strings between timezones.
 *
 * @example
 * ```typescript
 * const tz = new TimezoneHelper();
 * tz.detectTimezone();                          // "America/New_York"
 * tz.toLocal('2025-01-15T10:00:00', 'UTC');    // Converted to local time
 * ```
 */
export class TimezoneHelper {
  /**
   * Detect the browser/system timezone.
   * Returns an IANA timezone string (e.g., "America/New_York").
   */
  detectTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Convert an ISO date string from one timezone to another.
   *
   * @param dateString - ISO 8601 date string (e.g., "2025-01-15T10:00:00")
   * @param fromTz - Source IANA timezone (e.g., "UTC", "America/Chicago")
   * @param toTz - Target IANA timezone
   * @returns Formatted date string in the target timezone
   */
  convert(dateString: string, fromTz: string, toTz: string): string {
    // Parse the date as if it were in the source timezone
    const date = new Date(dateString);

    // If the input doesn't include a timezone offset, treat it as the fromTz
    if (!dateString.includes('Z') && !dateString.includes('+') && !/\d{2}:\d{2}$/.test(dateString)) {
      const sourceFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: fromTz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(date);

      // Re-parse to get proper UTC offset handling
      const reparse = new Date(sourceFormatted);
      if (!isNaN(reparse.getTime())) {
        return this.formatInTimezone(reparse, toTz);
      }
    }

    return this.formatInTimezone(date, toTz);
  }

  /**
   * Convert a store date string to the local (browser/system) timezone.
   *
   * @param dateString - ISO 8601 date string from the API
   * @param storeTz - The store's timezone (default: "UTC")
   * @returns Date string in the local timezone
   */
  toLocal(dateString: string, storeTz: string = 'UTC'): string {
    return this.convert(dateString, storeTz, this.detectTimezone());
  }

  private formatInTimezone(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(date).replace(' ', 'T');
  }
}
