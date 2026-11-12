type DateLike = string | number | Date | null | undefined;

export function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  // Date-only strings (YYYY-MM-DD) are parsed as local dates to avoid
  // the UTC offset shifting the displayed day.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const local = new Date(y, m - 1, d);
    return isNaN(local.getTime()) ? null : local;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateForDisplay(value: DateLike, locale = "es-HN"): string {
  const date = toDate(value);
  if (!date) return "-";
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateForInput(value: DateLike): string {
  const date = toDate(value);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateRange(start: DateLike, end: DateLike, locale = "es-HN"): string {
  if (!start && !end) return "-";
  if (!end) return formatDateForDisplay(start, locale);
  if (!start) return formatDateForDisplay(end, locale);
  return `${formatDateForDisplay(start, locale)} - ${formatDateForDisplay(end, locale)}`;
}

export function isDateExpired(value: DateLike, reference: Date = new Date()): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date.getTime() < reference.getTime();
}
