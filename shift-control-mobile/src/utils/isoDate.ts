const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatLocalDateAsIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseIsoDateAsLocalDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearValue, monthValue, dayValue] = value.split("-");

  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);

  const date = new Date(year, month - 1, day);

  const matchesOriginalDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return matchesOriginalDate ? date : null;
}