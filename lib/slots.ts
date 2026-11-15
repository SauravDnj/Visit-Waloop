import { booking } from "./config";

/** Pure slot maths shared by the API and the UI. All slot times are IST. */

export type Slot = {
  /** ISO start, e.g. 2026-11-16T10:00:00+05:30 */
  start: string;
  end: string;
  /** "10:00 AM" */
  label: string;
  available: boolean;
};

const IST_OFFSET_MS = 330 * 60 * 1000;

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** yyyy-mm-dd of the given instant, as seen in IST. */
export function istDateKey(d: Date) {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Day of week (0 = Sunday) for an IST date key. */
export function dayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export function isValidDateKey(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && !Number.isNaN(Date.parse(`${dateKey}T00:00:00Z`));
}

function addDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** Every slot on a date per the booking rules, before checking the calendar. */
export function slotsForDate(dateKey: string, now = new Date()): Slot[] {
  if (!booking.workDays.includes(dayOfWeek(dateKey))) return [];

  const start = toMinutes(booking.dayStart);
  const end = toMinutes(booking.dayEnd);
  const breaks = booking.breaks.map(([a, b]) => [toMinutes(a), toMinutes(b)]);
  const earliest = now.getTime() + booking.minNoticeMinutes * 60 * 1000;

  const slots: Slot[] = [];
  for (let t = start; t + booking.slotMinutes <= end; t += booking.slotMinutes) {
    const tEnd = t + booking.slotMinutes;
    if (breaks.some(([a, b]) => t < b && tEnd > a)) continue;

    const startIso = `${dateKey}T${pad(Math.floor(t / 60))}:${pad(t % 60)}:00${booking.utcOffset}`;
    const endIso = `${dateKey}T${pad(Math.floor(tEnd / 60))}:${pad(tEnd % 60)}:00${booking.utcOffset}`;
    if (Date.parse(startIso) < earliest) continue;

    slots.push({ start: startIso, end: endIso, label: formatTime(t), available: true });
  }
  return slots;
}

/** Working dates within the booking window that still have at least one slot. */
export function bookableDates(now = new Date()) {
  const today = istDateKey(now);
  const dates: string[] = [];
  for (let i = 0; i <= booking.daysAhead; i++) {
    const key = addDays(today, i);
    if (slotsForDate(key, now).length > 0) dates.push(key);
  }
  return dates;
}

/** Minutes after midnight IST of an ISO slot start. */
export function slotMinutes(iso: string) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
}

/** "Monday, 16 November 2026" for an IST date key. */
export function formatLongDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}
