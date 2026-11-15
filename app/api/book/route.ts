import type { NextRequest } from "next/server";
import { slotsForDate } from "@/lib/slots";
import {
  CalendarError,
  createDemoMeeting,
  getBusy,
  isGoogleConfigured,
  overlaps,
} from "@/lib/google-calendar";

const INTERESTS = new Set([
  "WhatsApp API",
  "Chatbots",
  "Conversational CRM",
  "Workflows",
  "Payments",
  "AI Agents",
]);

// Simple per-IP throttle: 5 bookings per 10 minutes (per server instance).
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const windowStart = Date.now() - 10 * 60 * 1000;
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  recent.push(Date.now());
  hits.set(ip, recent);
  return recent.length > 5;
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real visitors never fill this hidden field.
  if (str(body.website, 200)) {
    return Response.json({ ok: true, meetLink: "", demoMode: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) {
    return Response.json({ error: "Too many booking attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const name = str(body.name, 80);
  const email = str(body.email, 120).toLowerCase();
  const phone = str(body.phone, 20);
  const company = str(body.company, 100);
  const message = str(body.message, 500);
  const start = str(body.start, 40);
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((i): i is string => typeof i === "string" && INTERESTS.has(i))
    : [];

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fieldErrors.email = "Please enter a valid email address.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) fieldErrors.phone = "Please enter a valid phone number.";
  if (Object.keys(fieldErrors).length) {
    return Response.json({ error: "Please check the highlighted fields.", fieldErrors }, { status: 400 });
  }

  // The slot must be one we actually offer, and still in the future.
  const slot = slotsForDate(start.slice(0, 10)).find((s) => s.start === start);
  if (!slot) {
    return Response.json({ error: "That time is no longer available. Please pick another slot.", code: "slot" }, { status: 409 });
  }

  try {
    const busy = await getBusy(slot.start, slot.end);
    if (overlaps(busy, slot.start, slot.end)) {
      return Response.json(
        { error: "Someone just booked this slot. Please pick another time.", code: "slot" },
        { status: 409 },
      );
    }

    const meeting = await createDemoMeeting({
      start: slot.start,
      end: slot.end,
      name,
      email,
      phone,
      company,
      interests,
      message,
    });

    return Response.json({
      ok: true,
      start: slot.start,
      end: slot.end,
      meetLink: meeting.meetLink,
      demoMode: !isGoogleConfigured,
    });
  } catch (err) {
    console.error(err instanceof CalendarError ? err.message : err);
    return Response.json(
      { error: "We couldn't schedule the meeting right now. Please try again or message us on WhatsApp." },
      { status: 502 },
    );
  }
}
