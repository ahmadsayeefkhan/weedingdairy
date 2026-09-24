// "Today" is fixed by APP_TODAY for deterministic demos and tests; otherwise the real date (Asia/Dhaka).
export function today(): Date {
  const fixed = process.env.APP_TODAY;
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return new Date(`${fixed}T00:00:00Z`);
  const d = new Date(Date.now() + 6 * 3600_000); // UTC+6
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function parseDateInput(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
