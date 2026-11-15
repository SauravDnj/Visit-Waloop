# WALOOP Visiting Card

Single-page digital visiting card for WALOOP: logo, call, WhatsApp, email, socials, save-contact (vCard), and **slot-based demo booking** that creates a **Google Meet** with reminders.

Stack: Next.js 16 · React 19 · Tailwind CSS v4 · lucide-react. Light theme, WALOOP brand tokens (same as waloop.in).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

## Edit content

Everything editable is in `lib/config.ts`:

- `brand`: phone, WhatsApp, email, website, tagline
- `socials`: social profile URLs (an empty `href` hides that icon)
- `booking`: working days, hours, lunch break, slot length, minimum notice, days ahead

## Intro video

The card shows an autoplaying video below the tagline. It starts muted (browsers block autoplay with sound) and has a "Tap for sound" button. It pauses when scrolled off-screen and doesn't autoplay for visitors who prefer reduced motion.

- **Use your own video:** save it as `public/video/waloop-intro.mp4`. It replaces the demo clip automatically, with no code change.
- Keep it under ~10 MB (720p, H.264) so it loads fast on mobile.
- A vertical reel needs `introVideo.aspect` in `lib/config.ts` set to `"9 / 16"`. You can also change the title or poster image there.
- `public/video/waloop-demo.webm` is a 16-second branded placeholder and can be deleted once your video is in.

## How booking works

1. `GET /api/slots` lists bookable dates. `GET /api/slots?date=YYYY-MM-DD` returns that day's slots, and Google Calendar **free/busy** marks taken ones as unavailable. Anything already on the calendar blocks the slot, including personal events.
2. `POST /api/book` checks the slot again, then creates a calendar event with:
   - an auto-generated **Google Meet** link
   - the guest (and optional `DEMO_TEAM_EMAILS`) as attendees, so **Google emails the invite**
   - reminders on the organizer's calendar (email 24 h and 1 h before, popup 15 min before)
3. The visitor sees a confirmation with the Meet link and a "Confirm on WhatsApp" button.

Without Google credentials the site runs in **preview mode**: the flow works end to end, but bookings are held in memory and no invite is sent. A yellow notice is shown.

## Connect Google Calendar (one time)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Calendar API** and the **Gmail API** (Gmail sends the reminders).
2. Under **OAuth consent screen**, set up the app and add the WALOOP Google account as a test user. Publish the app to "In production" so the refresh token doesn't expire after 7 days. Google will show an "unverified app" warning when you sign in. Because only your own account uses it, choose **Advanced → Continue**.
3. Under **Credentials**, create an **OAuth client ID** of type **Desktop app**.
4. `cp .env.example .env.local` and paste the client ID and secret.
5. Run `npm run google:token`, open the URL, sign in with the account whose calendar hosts demos, then paste the printed `GOOGLE_REFRESH_TOKEN` into `.env.local`.
6. Restart `npm run dev`. The preview notice disappears and bookings create real Meet invites.

For deployment (e.g. Vercel), add the same variables in the host's environment settings.

## Guest reminders (cron)

`GET /api/reminders` emails each guest a WALOOP-branded reminder **~24 h before** and **~1 h before** their demo. It sends through the Gmail API from the connected account. The "already sent" flags are stored on the calendar event, so no database is needed and nothing is sent twice. Bookings made less than 24 h ahead get only the 1-hour reminder.

Call it every 10–15 minutes with the secret from `.env.local`:

```
GET https://<your-domain>/api/reminders
Authorization: Bearer <CRON_SECRET>
```

Any scheduler works: [cron-job.org](https://cron-job.org) (free), a GitHub Actions schedule, or Vercel Cron. Vercel's Hobby plan only allows daily crons, so use Pro or an external scheduler.

Google also sends the guest its own invite email, and after the event lands on their calendar, their calendar app reminds them based on their settings.

## Notes

- All slot times are IST (Asia/Kolkata). Visitors in other time zones also see their local time.
- The per-IP rate limit and the preview-mode store are in memory, so they reset on server restart. That's fine for one instance; use a shared store if you scale out.
