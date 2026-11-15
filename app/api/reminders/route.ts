import type { NextRequest } from "next/server";
import { brand, whatsappLink } from "@/lib/config";
import { formatTime } from "@/lib/slots";
import {
  CalendarError,
  isGoogleConfigured,
  listUpcomingDemos,
  markReminderSent,
  sendEmail,
  type UpcomingDemo,
} from "@/lib/google-calendar";

/**
 * GET /api/reminders — call every 10–15 minutes from a cron job with
 *   Authorization: Bearer <CRON_SECRET>
 * Emails each guest a reminder ~24 h and ~1 h before their demo. Sent state is
 * stored on the calendar event itself, so no reminder goes out twice.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGoogleConfigured) {
    return Response.json({ skipped: "Google Calendar not configured" });
  }

  const now = Date.now();
  const sent: { id: string; kind: string }[] = [];
  const failed: { id: string; error: string }[] = [];

  let demos: UpcomingDemo[];
  try {
    demos = await listUpcomingDemos(new Date(now).toISOString(), new Date(now + 25 * 3600_000).toISOString());
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof CalendarError ? err.message : "Failed to list demos" }, { status: 502 });
  }

  for (const demo of demos) {
    const minutesLeft = (Date.parse(demo.start) - now) / 60_000;
    let kind: "r24" | "r1" | null = null;
    if (minutesLeft <= 70 && !demo.sent.r1) kind = "r1";
    else if (minutesLeft <= 24 * 60 && minutesLeft > 70 && !demo.sent.r24) kind = "r24";
    if (!kind) continue;

    try {
      const { subject, html } = reminderEmail(demo, kind);
      await sendEmail(demo.guestEmail, subject, html);
      // An hour-before reminder also covers the day-before one.
      await markReminderSent(demo, kind === "r1" ? ["r1", "r24"] : ["r24"]);
      sent.push({ id: demo.id, kind });
    } catch (err) {
      console.error(err);
      failed.push({ id: demo.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return Response.json({ checked: demos.length, sent, failed });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function reminderEmail(demo: UpcomingDemo, kind: "r24" | "r1") {
  const d = new Date(demo.start);
  const day = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(d);
  const time = formatTime(Math.floor(((d.getTime() + 330 * 60_000) % 86_400_000) / 60_000));
  const first = escapeHtml(demo.guestName.split(" ")[0] || "there");

  const subject =
    kind === "r1"
      ? `Starting in 1 hour: your WALOOP demo at ${time} IST`
      : `Reminder: your WALOOP demo on ${day} at ${time} IST`;
  const lead =
    kind === "r1"
      ? "Your WALOOP demo starts in about an hour."
      : "A quick reminder about your WALOOP demo tomorrow.";

  const button = demo.meetLink
    ? `<a href="${demo.meetLink}" style="display:inline-block;background:#0b5cff;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:12px">Join Google Meet</a>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;background:#f4f7fb;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#071330">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e3e9f2">
        <tr><td style="height:8px;background:linear-gradient(100deg,#0b5cff,#07b6e8,#14c95f)"></td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0;font-size:22px;font-weight:700">Hi ${first},</p>
          <p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:#55617a">${lead}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;width:100%;background:#eef3f9;border-radius:14px">
            <tr><td style="padding:18px 20px;font-size:15px;line-height:1.7">
              <strong>${day}</strong><br>${time} IST · 30 minutes · Google Meet
            </td></tr>
          </table>
          ${button}
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#55617a">
            Need to reschedule? Reply to this email or
            <a href="${whatsappLink("Hi WALOOP, I need to reschedule my demo.")}" style="color:#0b5cff">message us on WhatsApp</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #e3e9f2;font-size:13px;color:#55617a">
          <strong style="color:#071330">${brand.name}</strong> · ${brand.tagline} ·
          <a href="${brand.website}" style="color:#0b5cff">${brand.websiteLabel}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
