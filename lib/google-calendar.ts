import "server-only";
import { booking } from "./config";

/**
 * Minimal Google Calendar client (REST over fetch, OAuth refresh token).
 *
 * Required env vars (see .env.example):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 * Optional:
 *   GOOGLE_CALENDAR_ID   (default "primary")
 *   DEMO_TEAM_EMAILS     comma-separated teammates added to every demo
 *   GOOGLE_SENDER_EMAIL  address of the connected account, to show "WALOOP" as sender name
 *
 * Without credentials the module runs in demo mode: bookings are held in memory
 * and a placeholder Meet link is returned, so the UI can be tried end to end.
 */

const env = {
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
  calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
  senderEmail: process.env.GOOGLE_SENDER_EMAIL ?? "",
  teamEmails: (process.env.DEMO_TEAM_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),
};

const DEMO_SOURCE = "waloop-visiting-card";

export const isGoogleConfigured = Boolean(env.clientId && env.clientSecret && env.refreshToken);

export type BusyRange = { start: number; end: number };

export class CalendarError extends Error {}

// ---------- demo mode ----------

const demoBookings: BusyRange[] = [];

// ---------- auth ----------

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: env.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new CalendarError(`Google token refresh failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function google<T>(path: string, init: RequestInit, base = "https://www.googleapis.com/calendar/v3"): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new CalendarError(`Google API ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// ---------- public API ----------

/** Busy ranges on the demo calendar between two instants. */
export async function getBusy(timeMin: string, timeMax: string): Promise<BusyRange[]> {
  if (!isGoogleConfigured) return demoBookings;

  const data = await google<{
    calendars: Record<string, { busy: { start: string; end: string }[]; errors?: unknown[] }>;
  }>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: booking.timeZone,
      items: [{ id: env.calendarId }],
    }),
  });
  const cal = Object.values(data.calendars)[0];
  if (!cal || cal.errors?.length) {
    throw new CalendarError(`Calendar free/busy error: ${JSON.stringify(cal?.errors)}`);
  }
  return cal.busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export function overlaps(busy: BusyRange[], start: string, end: string) {
  const s = Date.parse(start);
  const e = Date.parse(end);
  return busy.some((b) => s < b.end && e > b.start);
}

export type DemoRequest = {
  start: string;
  end: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  interests: string[];
  message: string;
};

export type CreatedMeeting = { eventId: string; meetLink: string; demo: boolean };

/** Creates the calendar event with a Google Meet link and emails the invite to the guest. */
export async function createDemoMeeting(req: DemoRequest): Promise<CreatedMeeting> {
  if (!isGoogleConfigured) {
    demoBookings.push({ start: Date.parse(req.start), end: Date.parse(req.end) });
    return { eventId: `demo-${Date.now()}`, meetLink: "https://meet.google.com/", demo: true };
  }

  const description = [
    `Demo booked from the WALOOP visiting card.`,
    ``,
    `Name: ${req.name}`,
    `Company: ${req.company || "—"}`,
    `Email: ${req.email}`,
    `Phone / WhatsApp: ${req.phone}`,
    `Interested in: ${req.interests.length ? req.interests.join(", ") : "—"}`,
    req.message ? `\nNotes from guest:\n${req.message}` : "",
  ].join("\n");

  const event = await google<{ id: string; hangoutLink?: string; conferenceData?: { entryPoints?: { uri: string }[] } }>(
    `/calendars/${encodeURIComponent(env.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: `${booking.meetingTitle} — ${req.company || req.name}`,
        description,
        start: { dateTime: req.start, timeZone: booking.timeZone },
        end: { dateTime: req.end, timeZone: booking.timeZone },
        attendees: [
          { email: req.email, displayName: req.name },
          ...env.teamEmails.map((email) => ({ email })),
        ],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
        guestsCanInviteOthers: true,
        guestsCanModify: false,
        extendedProperties: {
          private: {
            source: DEMO_SOURCE,
            guestName: req.name,
            guestEmail: req.email,
            // Booked less than 24 h ahead: skip the "tomorrow" reminder.
            r24: Date.parse(req.start) - Date.now() < 24 * 3600_000 ? "1" : "0",
            r1: "0",
          },
        },
      }),
    },
  );

  const meetLink = event.hangoutLink ?? event.conferenceData?.entryPoints?.[0]?.uri ?? "";
  return { eventId: event.id, meetLink, demo: false };
}

// ---------- reminders ----------

export type UpcomingDemo = {
  id: string;
  start: string;
  meetLink: string;
  guestName: string;
  guestEmail: string;
  sent: { r24: boolean; r1: boolean };
  privateProps: Record<string, string>;
};

/** Demo events created by this site that start within the window. */
export async function listUpcomingDemos(timeMin: string, timeMax: string): Promise<UpcomingDemo[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    privateExtendedProperty: `source=${DEMO_SOURCE}`,
    maxResults: "100",
  });
  const data = await google<{
    items: {
      id: string;
      status: string;
      start: { dateTime?: string };
      hangoutLink?: string;
      extendedProperties?: { private?: Record<string, string> };
    }[];
  }>(`/calendars/${encodeURIComponent(env.calendarId)}/events?${params}`, { method: "GET" });

  return data.items
    .filter((e) => e.status !== "cancelled" && e.start.dateTime)
    .map((e) => {
      const p = e.extendedProperties?.private ?? {};
      return {
        id: e.id,
        start: e.start.dateTime!,
        meetLink: e.hangoutLink ?? "",
        guestName: p.guestName ?? "",
        guestEmail: p.guestEmail ?? "",
        sent: { r24: p.r24 === "1", r1: p.r1 === "1" },
        privateProps: p,
      };
    })
    .filter((e) => e.guestEmail);
}

export async function markReminderSent(demo: UpcomingDemo, keys: ("r24" | "r1")[]) {
  const updated = { ...demo.privateProps };
  for (const k of keys) updated[k] = "1";
  await google(`/calendars/${encodeURIComponent(env.calendarId)}/events/${encodeURIComponent(demo.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ extendedProperties: { private: updated } }),
  });
}

/** Sends an HTML email from the connected Google account via the Gmail API. */
export async function sendEmail(to: string, subject: string, html: string) {
  const encodeHeader = (v: string) => `=?UTF-8?B?${Buffer.from(v).toString("base64")}?=`;
  const mime = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    // Gmail uses the connected account's address when no From is given.
    ...(env.senderEmail ? [`From: ${encodeHeader("WALOOP")} <${env.senderEmail}>`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
  ].join("\r\n");

  await google(
    "/users/me/messages/send",
    { method: "POST", body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }) },
    "https://gmail.googleapis.com/gmail/v1",
  );
}
