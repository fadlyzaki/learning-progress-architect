export function getGoogleCalendarUrl(
  title: string,
  description: string,
  durationMinutes: number
): string {
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', `Study: ${title}`);
  url.searchParams.set('details', description);
  
  // Calculate next hour for default start time
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  
  // Format as YYYYMMDDTHHmmssZ
  const formatDates = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  url.searchParams.set('dates', `${formatDates(start)}/${formatDates(end)}`);
  
  return url.toString();
}
