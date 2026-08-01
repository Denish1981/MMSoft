import type { ScheduleEntry, ScheduleMaster } from '../types';

/**
 * Parses a timing string (e.g. "08:00 AM - 10:00 AM", "8:30 AM", "07:00 PM", "18:00")
 * and converts the start time into total minutes from midnight (0 to 1439).
 */
export const parseTimeStringToMinutes = (timingsStr?: string | null): number => {
  if (!timingsStr || typeof timingsStr !== 'string') return 99999;

  // Extract start time segment before any separator like '-', 'to', '—', or '~'
  const startSegment = timingsStr.split(/[-—~]|(?:\bto\b)/i)[0].trim();
  if (!startSegment) return 99999;

  const upper = startSegment.toUpperCase();
  const isPM = upper.includes('PM');
  const isAM = upper.includes('AM');

  // Match digits for hour and optional minutes
  const match = upper.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 99999;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (isNaN(hours)) return 99999;

  if (isPM) {
    if (hours < 12) hours += 12;
  } else if (isAM) {
    if (hours === 12) hours = 0;
  }

  return hours * 60 + minutes;
};

/**
 * Sorts an array of schedule entries chronologically by event date and start time.
 */
export const sortScheduleEntries = <T extends ScheduleEntry>(entries: T[]): T[] => {
  if (!entries || !Array.isArray(entries)) return [];
  return [...entries].sort((a, b) => {
    // 1. Sort by eventDate ascending
    const dateA = a.eventDate ? a.eventDate.split('T')[0] : '';
    const dateB = b.eventDate ? b.eventDate.split('T')[0] : '';
    if (dateA !== dateB) {
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    }

    // 2. Sort by timing start time in minutes ascending
    const timeA = parseTimeStringToMinutes(a.timings);
    const timeB = parseTimeStringToMinutes(b.timings);
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 3. Fallback to event name
    const eventA = a.event || '';
    const eventB = b.event || '';
    return eventA.localeCompare(eventB);
  });
};

/**
 * Sorts master schedules and sorts all entries inside each master schedule chronologically.
 */
export const sortSchedules = <T extends ScheduleMaster>(schedules: T[]): T[] => {
  if (!schedules || !Array.isArray(schedules)) return [];
  return [...schedules]
    .map(sched => ({
      ...sched,
      entries: sortScheduleEntries(sched.entries || [])
    }))
    .sort((a, b) => {
      // 1. Sort by start date ascending
      const dateA = a.startDate ? a.startDate.split('T')[0] : '';
      const dateB = b.startDate ? b.startDate.split('T')[0] : '';
      if (dateA !== dateB) {
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      }

      // 2. Active schedules first if dates are equal
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }

      return (a.title || '').localeCompare(b.title || '');
    });
};
