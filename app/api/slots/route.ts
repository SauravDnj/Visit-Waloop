import type { NextRequest } from "next/server";
import { bookableDates, isValidDateKey, slotsForDate } from "@/lib/slots";
import { CalendarError, getBusy, isGoogleConfigured, overlaps } from "@/lib/google-calendar";

/** GET /api/slots            → { dates }
 *  GET /api/slots?date=YYYY-MM-DD → { date, slots } with live availability */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const now = new Date();

  if (!date) {
    return Response.json({ dates: bookableDates(now), demoMode: !isGoogleConfigured });
  }

  if (!isValidDateKey(date) || !bookableDates(now).includes(date)) {
    return Response.json({ error: "That date isn't available for demos." }, { status: 400 });
  }

  const slots = slotsForDate(date, now);
  try {
    const busy = await getBusy(slots[0].start, slots[slots.length - 1].end);
    for (const slot of slots) slot.available = !overlaps(busy, slot.start, slot.end);
  } catch (err) {
    console.error(err instanceof CalendarError ? err.message : err);
    return Response.json(
      { error: "We couldn't load live availability. Please try again or message us on WhatsApp." },
      { status: 502 },
    );
  }

  return Response.json(
    { date, slots, demoMode: !isGoogleConfigured },
    { headers: { "Cache-Control": "no-store" } },
  );
}
