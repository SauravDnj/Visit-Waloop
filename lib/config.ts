/**
 * Everything editable about the visiting card lives here:
 * contact details, social profiles and demo-booking rules.
 */

export const brand = {
  name: "WALOOP",
  tagline: "Built on Trust. Driven by AI.",
  headline: "Connect. Automate. Engage. Grow.",
  description:
    "One platform for WhatsApp, Instagram, Facebook and RCS — with conversational CRM, chatbots, workflows, payments and AI built in.",
  website: "https://waloop.in",
  websiteLabel: "waloop.in",
  appUrl: "https://app.waloop.in",
  appLabel: "app.waloop.in",
  email: "official.waloop@gmail.com",
  phone: "+91 87584 08987",
  phoneLink: "tel:+918758408987",
  whatsapp: "+91 87580 18450",
  whatsappNumber: "918758018450",
};

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${brand.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export type SocialKey = "instagram" | "linkedin" | "facebook" | "youtube" | "x";

/**
 * Social profiles. A profile with an empty `href` is hidden automatically.
 * TODO: confirm these URLs — they are placeholders until replaced with WALOOP's real profiles.
 */
export const socials: { key: SocialKey; label: string; href: string }[] = [
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/waloop.in" },
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/waloop" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/waloop.in" },
  { key: "youtube", label: "YouTube", href: "https://www.youtube.com/@waloop" },
  { key: "x", label: "X (Twitter)", href: "https://x.com/waloop_in" },
];

/**
 * Intro video shown on the card (autoplays muted, loops).
 * To use your own video, save it as public/video/waloop-intro.mp4 — it takes priority
 * over the demo clip automatically. Optionally add public/video/waloop-intro-poster.jpg
 * and point `poster` at it.
 */
export const introVideo = {
  title: "Meet WALOOP",
  sources: [
    { src: "/video/waloop-intro.mp4", type: "video/mp4" },
    { src: "/video/waloop-demo.webm", type: "video/webm" },
  ],
  poster: "/video/waloop-demo-poster.jpg",
  /** CSS aspect ratio of the frame, e.g. "16 / 9" (landscape) or "9 / 16" (reel). */
  aspect: "16 / 9",
};

/** Demo booking rules. All times are in IST (Asia/Kolkata, UTC+05:30, no daylight saving). */
export const booking = {
  timeZone: "Asia/Kolkata",
  utcOffset: "+05:30",
  /** 0 = Sunday … 6 = Saturday */
  workDays: [1, 2, 3, 4, 5, 6],
  dayStart: "10:00",
  dayEnd: "19:00",
  /** Time ranges with no demos, e.g. lunch. */
  breaks: [["13:00", "14:00"]] as [string, string][],
  slotMinutes: 30,
  /** Earliest bookable slot is this many minutes from now. */
  minNoticeMinutes: 120,
  /** How far ahead visitors can book (calendar days). */
  daysAhead: 14,
  meetingTitle: "WALOOP Product Demo",
};
