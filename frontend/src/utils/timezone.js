/**
 * Timezone utilities for VISARTECH People
 * Standardized to America/Chicago (CST / CDT)
 */

export const CHICAGO_TIMEZONE = 'America/Chicago';

/**
 * Returns the current date/time in America/Chicago
 */
export function getChicagoNow() {
  const now = new Date();
  const chicagoString = now.toLocaleString('en-US', { timeZone: CHICAGO_TIMEZONE });
  return new Date(chicagoString);
}

/**
 * Returns a time-appropriate greeting based on America/Chicago current hour
 */
export function getChicagoGreeting() {
  const chicagoDate = getChicagoNow();
  const hour = chicagoDate.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Formats a Date or ISO string into a friendly Chicago date string
 * e.g. "Tuesday, November 17, 2026"
 */
export function formatChicagoDate(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CHICAGO_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Formats a Date or ISO string into a Chicago time string
 * e.g. "09:15 AM CST"
 */
export function formatChicagoTime(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CHICAGO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(d);
}

/**
 * Formats a short timestamp for activity feeds
 * e.g. "Today at 9:02 AM CST" or "Yesterday at 4:30 PM CST"
 */
export function formatChicagoActivityTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: CHICAGO_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${timeStr} CST`;
}
