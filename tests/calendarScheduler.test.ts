import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleCalendarEvents } from '../server/services/calendarSchedulerService.ts';

test('scheduler splits long tasks deterministically and anchors events to the selected Jakarta study date', () => {
  const input = {
    weeklyHours: 5,
    startDate: '2026-04-10',
    tasks: [
      {
        title: 'Long task',
        description: 'Split me',
        estimatedMinutes: 300,
      },
      {
        title: 'Short task',
        description: 'Keep me short',
        estimatedMinutes: 45,
      },
    ],
    timeZone: 'Asia/Jakarta',
    defaultStartHour: 19,
    maxEventMinutes: 120,
  };

  const firstRun = scheduleCalendarEvents(input);
  const secondRun = scheduleCalendarEvents(input);

  assert.deepEqual(secondRun, firstRun);
  assert.equal(firstRun.length, 4);
  assert.deepEqual(
    firstRun.map((event) => event.durationMinutes),
    [100, 100, 100, 45],
  );
  assert.ok(firstRun.every((event) => event.durationMinutes > 0 && event.durationMinutes <= 120));
  assert.equal(firstRun[0].startAt, '2026-04-10T12:00:00.000Z');
  assert.equal(firstRun[0].endAt, '2026-04-10T13:40:00.000Z');
  assert.equal(firstRun[1].startAt, '2026-04-11T12:00:00.000Z');
  assert.equal(firstRun[2].startAt, '2026-04-12T12:00:00.000Z');
  assert.equal(firstRun[3].startAt, '2026-04-17T12:00:00.000Z');
  assert.deepEqual(
    firstRun.map((event) => event.taskIndex),
    [0, 0, 0, 1],
  );
});