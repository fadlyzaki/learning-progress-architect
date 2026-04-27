export function getGoogleCalendarUrl(
  title: string,
  description: string,
  durationMinutes: number,
  taskId?: number
): string {
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', `Study: ${title}`);
  
  let fullDescription = description;
  if (taskId && typeof window !== 'undefined') {
    const sessionUrl = `${window.location.origin}/app/session/${taskId}`;
    fullDescription = `${description}\n\nSession Link: ${sessionUrl}`;
  }
  
  url.searchParams.set('details', fullDescription);
  
  // Calculate next hour for default start time
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  
  // Format as YYYYMMDDTHHmmssZ
  const formatDates = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  
  url.searchParams.set('dates', `${formatDates(start)}/${formatDates(end)}`);
  
  return url.toString();
}
