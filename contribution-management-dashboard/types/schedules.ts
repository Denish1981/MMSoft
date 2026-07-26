export interface ScheduleEntry {
  id?: number;
  scheduleId?: number;
  eventDate: string; // YYYY-MM-DD
  day?: string;      // e.g. "Monday", "Day 1"
  event: string;     // Event description/title
  timings: string;   // e.g. "08:00 AM - 10:00 AM"
  createdAt?: string;
}

export interface ScheduleMaster {
  id: number;
  festivalId: number;
  festivalName?: string;
  title?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isActive: boolean;
  entries: ScheduleEntry[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
