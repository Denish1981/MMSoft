import type { ScheduleEntry, ScheduleMaster } from '../types';

/**
 * Normalizes various common date strings (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.) to YYYY-MM-DD
 */
export const normalizeDateString = (str?: string | null): string => {
  if (!str) return '';
  const trimmed = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const year = match[3];

    // If second part is > 12 and first <= 12, it's MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    // Default assume DD/MM/YYYY
    return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }

  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }

  return '';
};

/**
 * Parses copied spreadsheet text (Tab-separated from Excel or Google Sheets, CSV, or pipe-separated)
 * into ScheduleEntry objects.
 */
export const parseSpreadsheetTextToEntries = (
  rawText: string,
  defaultDate: string = ''
): ScheduleEntry[] => {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result: ScheduleEntry[] = [];

  for (const line of lines) {
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else {
      parts = line.split(',');
    }

    parts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length === 0 || parts.every(p => !p)) continue;

    // Check if this is a header row
    const lowerFirst = parts[0].toLowerCase();
    if (lowerFirst.includes('date') || lowerFirst === 'day' || lowerFirst === 'event') {
      if (parts.some(p => p.toLowerCase().includes('time') || p.toLowerCase().includes('program') || p.toLowerCase().includes('event'))) {
        continue; // Skip header line
      }
    }

    let eventDate = defaultDate;
    let day = '';
    let event = '';
    let timings = '';

    if (parts.length >= 4) {
      eventDate = normalizeDateString(parts[0]) || defaultDate;
      day = parts[1];
      event = parts[2];
      timings = parts[3];
    } else if (parts.length === 3) {
      const potentialDate = normalizeDateString(parts[0]);
      if (potentialDate) {
        eventDate = potentialDate;
        event = parts[1];
        timings = parts[2];
      } else {
        day = parts[0];
        event = parts[1];
        timings = parts[2];
      }
    } else if (parts.length === 2) {
      event = parts[0];
      timings = parts[1];
    } else if (parts.length === 1) {
      event = parts[0];
    }

    if (eventDate && !day) {
      try {
        const d = new Date(eventDate);
        if (!isNaN(d.getTime())) {
          day = d.toLocaleDateString('en-US', { weekday: 'long' });
        }
      } catch {
        // ignore
      }
    }

    if (event || timings || eventDate) {
      result.push({
        eventDate,
        day,
        event,
        timings
      });
    }
  }

  return result;
};

/**
 * Converts schedule entries into TSV (Tab-Separated Values) format for copying to Excel/Sheets.
 */
export const exportEntriesToTsv = (entries: ScheduleEntry[]): string => {
  if (!entries || entries.length === 0) return '';
  const headers = ['Date', 'Day', 'Event / Program', 'Timings'];
  const rows = entries.map(e => [
    e.eventDate ? e.eventDate.split('T')[0] : '',
    e.day || '',
    e.event || '',
    e.timings || ''
  ].join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
};

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

export interface DailyEventSummary {
  event: string;
  timings: string;
  frequency: number;
  totalDays: number;
  isExplicitDaily?: boolean;
}

/**
 * Identifies the everyday recurring events for a festival schedule (e.g. 2 events that occur daily throughout the festival).
 * Automatically detects events that repeat across multiple or all dates, or are marked with "Everyday"/"Daily".
 */
export const getDailyRecurringEvents = (entries: ScheduleEntry[]): DailyEventSummary[] => {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return [];

  const uniqueDates = new Set<string>();
  entries.forEach(e => {
    const d = e.eventDate ? e.eventDate.split('T')[0] : '';
    if (d) uniqueDates.add(d);
  });

  const totalDays = uniqueDates.size;

  // Group by normalized event name
  const eventMap = new Map<string, { event: string; timings: string; dates: Set<string>; isExplicit: boolean }>();

  for (const entry of entries) {
    if (!entry.event || !entry.event.trim()) continue;
    const normName = entry.event.toLowerCase().trim();
    const date = entry.eventDate ? entry.eventDate.split('T')[0] : '';
    const dayLower = (entry.day || '').toLowerCase();
    const isExplicit = dayLower.includes('everyday') || dayLower.includes('daily') || normName.includes('daily');

    if (!eventMap.has(normName)) {
      eventMap.set(normName, {
        event: entry.event.trim(),
        timings: entry.timings || '',
        dates: new Set<string>(),
        isExplicit
      });
    }

    const item = eventMap.get(normName)!;
    if (date) item.dates.add(date);
    if (isExplicit) item.isExplicit = true;
    if (!item.timings && entry.timings) item.timings = entry.timings;
  }

  const summaries: DailyEventSummary[] = [];
  for (const [, item] of eventMap.entries()) {
    summaries.push({
      event: item.event,
      timings: item.timings,
      frequency: item.dates.size,
      totalDays,
      isExplicitDaily: item.isExplicit
    });
  }

  // Filter & Sort
  summaries.sort((a, b) => {
    if (a.isExplicitDaily !== b.isExplicitDaily) {
      return a.isExplicitDaily ? -1 : 1;
    }
    if (a.frequency !== b.frequency) {
      return b.frequency - a.frequency;
    }
    const timeA = parseTimeStringToMinutes(a.timings);
    const timeB = parseTimeStringToMinutes(b.timings);
    return timeA - timeB;
  });

  let top2 = summaries.slice(0, 2);
  if (totalDays > 2) {
    top2 = top2.filter(s => s.isExplicitDaily || s.frequency >= 2);
  }

  return top2.sort((a, b) => parseTimeStringToMinutes(a.timings) - parseTimeStringToMinutes(b.timings));
};

/**
 * Checks if a given entry matches one of the recurring daily events.
 */
export const isDailyRecurringEvent = (entry: ScheduleEntry, dailyEvents: DailyEventSummary[]): boolean => {
  if (!entry || !entry.event || !dailyEvents || dailyEvents.length === 0) return false;
  const norm = entry.event.toLowerCase().trim();
  return dailyEvents.some(d => d.event.toLowerCase().trim() === norm);
};
