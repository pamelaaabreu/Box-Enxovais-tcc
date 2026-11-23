export type ChartGrouping = 'day' | 'month';

export function civilDate(
  value: string,
  timezone = 'America/Sao_Paulo',
): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function bucketLabel(
  value: string,
  group: ChartGrouping,
  full = false,
  timezone = 'America/Sao_Paulo',
): string {
  const date = civilDate(value, timezone);
  const [year, month, day] = date.split('-');
  return group === 'month'
    ? `${month}/${year}`
    : `${day}/${month}${full ? `/${year}` : ''}`;
}

export function periodLabels(
  from: string,
  until: string,
  timezone = 'America/Sao_Paulo',
): { from: string; until: string } {
  const exclusiveDate = civilDate(until, timezone);
  const calendar = new Date(`${exclusiveDate}T12:00:00Z`);
  calendar.setUTCDate(calendar.getUTCDate() - 1);
  return {
    from: bucketLabel(civilDate(from, timezone), 'day', true),
    until: bucketLabel(calendar.toISOString().slice(0, 10), 'day', true),
  };
}

export function dateLabelInterval(
  count: number,
  target = 7,
): (index: number) => boolean {
  const step = Math.max(1, Math.ceil((count - 1) / Math.max(1, target - 1)));
  return (index) =>
    index === count - 1 ||
    (index % step === 0 && count - 1 - index >= step / 2);
}
