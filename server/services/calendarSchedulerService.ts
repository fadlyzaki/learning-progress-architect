import type {
  CalendarSchedulerInput,
  CalendarSchedulingTask,
  ScheduledCalendarEvent,
} from '../types.ts';
import { addDays } from '../utils/date.ts';

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type DateTimeParts = DateParts & {
  hour: number;
  minute: number;
};

const MINUTES_PER_HOUR = 60;
const MILLIS_PER_MINUTE = 60_000;
const DAYS_PER_WEEK = 7;
const DEFAULT_START_HOUR = 19;
const DEFAULT_MAX_EVENT_MINUTES = 120;

function normalizeWholeNumber(value: number, fallback: number, minimum: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.round(value));
}

function parseDateParts(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  } satisfies DateParts;
}

function getDateTimeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

function getDateFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getZonedDateTimeParts(date: Date, timeZone: string): DateTimeParts {
  const parts = getDateTimeFormatter(timeZone).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? 0),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? 1),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? 1),
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
  };
}

function getZonedTodayParts(timeZone: string): DateParts {
  const parts = getDateFormatter(timeZone).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? 0),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? 1),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? 1),
  };
}

function addDaysToParts(parts: DateParts, days: number) {
  const shifted = addDays(new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0)), days);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  } satisfies DateParts;
}

function toEpochMinutes(parts: DateTimeParts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) / MILLIS_PER_MINUTE);
}

function toUtcInstant(dateParts: DateParts, hour: number, minute: number, timeZone: string) {
  let instant = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hour, minute, 0, 0));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = getZonedDateTimeParts(instant, timeZone);
    const desired = {
      ...dateParts,
      hour,
      minute,
    } satisfies DateTimeParts;
    const offsetMinutes = toEpochMinutes(actual) - toEpochMinutes(desired);

    if (offsetMinutes === 0) {
      break;
    }

    instant = new Date(instant.getTime() - offsetMinutes * MILLIS_PER_MINUTE);
  }

  return instant;
}

function resolveStartDate(startDate: string | null, timeZone: string) {
  const parsed = parseDateParts(startDate);
  if (parsed) {
    return parsed;
  }

  return addDaysToParts(getZonedTodayParts(timeZone), 1);
}

function splitTaskIntoDurations(task: CalendarSchedulingTask, maxEventMinutes: number) {
  const estimatedMinutes = normalizeWholeNumber(task.estimatedMinutes, maxEventMinutes, 1);
  const eventCount = Math.max(1, Math.ceil(estimatedMinutes / maxEventMinutes));
  const baseDuration = Math.floor(estimatedMinutes / eventCount);
  const remainder = estimatedMinutes % eventCount;

  return Array.from({ length: eventCount }, (_, index) => baseDuration + (index < remainder ? 1 : 0));
}

export function scheduleCalendarEvents(input: CalendarSchedulerInput): ScheduledCalendarEvent[] {
  const weeklyCapacityMinutes = Math.max(
    1,
    normalizeWholeNumber(input.weeklyHours * MINUTES_PER_HOUR, MINUTES_PER_HOUR, 1),
  );
  const startHour = Math.min(23, normalizeWholeNumber(input.defaultStartHour, DEFAULT_START_HOUR, 0));
  const maxEventMinutes = normalizeWholeNumber(
    input.maxEventMinutes,
    DEFAULT_MAX_EVENT_MINUTES,
    1,
  );
  const startDate = resolveStartDate(input.startDate, input.timeZone);

  const flattenedEvents = input.tasks.flatMap((task, taskIndex) =>
    splitTaskIntoDurations(task, maxEventMinutes).map((durationMinutes) => ({
      taskIndex,
      durationMinutes,
      summary: task.title,
      description: task.description,
    })),
  );

  let weekIndex = 0;
  let dayOffsetInWeek = 0;
  let usedWeekMinutes = 0;

  return flattenedEvents.map((event) => {
    if (
      dayOffsetInWeek >= DAYS_PER_WEEK ||
      (usedWeekMinutes > 0 && usedWeekMinutes + event.durationMinutes > weeklyCapacityMinutes)
    ) {
      weekIndex += 1;
      dayOffsetInWeek = 0;
      usedWeekMinutes = 0;
    }

    const eventDate = addDaysToParts(startDate, weekIndex * DAYS_PER_WEEK + dayOffsetInWeek);
    const startAt = toUtcInstant(eventDate, startHour, 0, input.timeZone);
    const endAt = new Date(startAt.getTime() + event.durationMinutes * MILLIS_PER_MINUTE);

    dayOffsetInWeek += 1;
    usedWeekMinutes += event.durationMinutes;

    return {
      taskIndex: event.taskIndex,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      durationMinutes: event.durationMinutes,
      summary: event.summary,
      description: event.description,
    } satisfies ScheduledCalendarEvent;
  });
}