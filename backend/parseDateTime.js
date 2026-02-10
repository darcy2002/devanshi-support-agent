/**
 * Parse date/time from conversation text for calendar event.
 * Uses chrono-node for natural language dates (e.g. "tomorrow at 2pm", "next Monday 10am").
 */

import * as chrono from 'chrono-node';

const DEFAULT_DURATION_MINUTES = 30;
const DEFAULT_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || 'UTC';

/**
 * Try to extract a date/time from text. Falls back to tomorrow at 10:00 in default timezone.
 * @param {string} text - Transcript or summary text
 * @param {string} [timeZone] - IANA timezone for default when none parsed
 * @returns {{ start: string, end: string, timeZone: string }} ISO date-time strings and timezone
 */
export function parseEventDateTime(text, timeZone = DEFAULT_TIMEZONE) {
  const ref = new Date();
  let startDate = null;

  if (text && typeof text === 'string') {
    const parsed = chrono.parse(text, ref, { forwardDate: true });
    if (parsed && parsed.length > 0 && parsed[0].date) {
      startDate = parsed[0].date();
    }
  }

  if (!startDate || Number.isNaN(startDate.getTime())) {
    // Default: tomorrow at 10:00
    startDate = new Date(ref);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0);
  }

  const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);

  return {
    start: startDate.toISOString().replace(/\.\d{3}Z$/, ''),
    end: endDate.toISOString().replace(/\.\d{3}Z$/, ''),
    timeZone: timeZone,
  };
}
