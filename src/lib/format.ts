// "Nov 15" style date for lists. The locale and time zone can be fixed (used by tests).
export function formatShortDate(iso: string, locale?: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone }).format(date);
}

// Server messages are lowercase ("file is empty"); the screen uses sentence case.
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
