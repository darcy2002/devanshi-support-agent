/**
 * Google Calendar API integration for creating events when call summary
 * shows intent to schedule a call with Devanshi.
 * @see https://developers.google.com/workspace/calendar/api/guides/create-events
 * @see https://developers.google.com/workspace/calendar/api/concepts
 */

import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Create OAuth2 client and set credentials from env (refresh token).
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 */
function getCalendarClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Create a calendar event.
 * @param {object} options - { summary, description?, start, end, timeZone? }
 * @param {string} options.summary - Event title
 * @param {string} [options.description] - Event description
 * @param {string} options.start - ISO date-time (e.g. 2025-02-03T10:00:00)
 * @param {string} options.end - ISO date-time
 * @param {string} [options.timeZone] - IANA timezone (e.g. America/Los_Angeles). Default UTC if omitted.
 * @returns {Promise<object>} Created event or throws
 */
export async function createCalendarEvent(options) {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('Google Calendar not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)');
  }
  const { summary, description, start, end, timeZone = 'UTC' } = options;
  const event = {
    summary: summary || 'Call with Devanshi',
    description: description || '',
    start: {
      dateTime: start,
      timeZone,
    },
    end: {
      dateTime: end,
      timeZone,
    },
  };
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: event,
  });
  return res.data;
}

/**
 * Check if Google Calendar is configured (credentials present).
 */
export function isCalendarConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}
