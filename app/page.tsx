import {
  BellRing,
  Bot,
  CalendarDays,
  CreditCard,
  MessagesSquare,
  Phone,
  Sparkles,
  Users,
  Video,
  Workflow,
  Clock,
} from "lucide-react";
import { ProfileCard } from "@/components/ProfileCard";
import { BookingWidget } from "@/components/BookingWidget";
import { WhatsAppIcon } from "@/components/icons";
import { brand, whatsappLink } from "@/lib/config";

const demoPerks = [
  { icon: Video, label: "Live on Google Meet" },
  { icon: Clock, label: "30 minutes, free" },
  { icon: BellRing, label: "Email reminders" },
];

const capabilities = [
  { icon: MessagesSquare, title: "Unified inbox", text: "WhatsApp, Instagram, Facebook and RCS in one place." },
  { icon: Users, title: "Conversational CRM", text: "Every contact, chat and deal organised automatically." },
  { icon: Bot, title: "Chatbots", text: "Answer, qualify and route customers 24×7." },
  { icon: Workflow, title: "Workflows", text: "Turn repetitive follow-ups into automations." },
  { icon: CreditCard, title: "Payments", text: "Collect payments right inside the conversation." },
  { icon: Sparkles, title: "AI agents", text: "AI that understands intent and drafts replies." },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="page-glow min-h-dvh pb-24 lg:pb-0">
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-8 lg:py-14">
        {/* Left: the visiting card */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <ProfileCard />
        </div>

        {/* Right: demo booking */}
        <div className="flex min-w-0 flex-col gap-6">
          <section
            id="book-demo"
            aria-labelledby="book-heading"
            className="animate-rise scroll-mt-4 overflow-hidden rounded-3xl border bg-surface shadow-[var(--shadow-soft)] [animation-delay:80ms]"
          >
            <header className="border-b bg-gradient-to-br from-brand/[0.06] via-transparent to-green/[0.07] p-5 sm:p-8">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Book a demo
              </p>
              <h2 id="book-heading" className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-[2rem]">
                See WALOOP in action — <span className="text-gradient">live, for your business.</span>
              </h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                Pick a slot that suits you. We&apos;ll send a Google Meet invite instantly and remind you before the call.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {demoPerks.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-[var(--shadow-card)] ring-1 ring-line"
                  >
                    <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </header>

            <BookingWidget />
          </section>

          <section
            aria-labelledby="caps-heading"
            className="animate-rise rounded-3xl border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-8 [animation-delay:160ms]"
          >
            <h2 id="caps-heading" className="text-xl font-bold text-ink">
              What you&apos;ll see in the demo
            </h2>
            <p className="mt-1 text-[15px] text-muted">{brand.headline} — from the first message to payment and follow-up.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 rounded-2xl border p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-heading font-semibold text-ink">{title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="flex flex-col items-center justify-between gap-2 px-1 pb-2 text-sm text-muted sm:flex-row">
            <p>
              © {year} {brand.name} · <span className="text-ink">{brand.tagline}</span>
            </p>
            <p className="flex gap-4">
              <a href={brand.website} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-brand">
                {brand.websiteLabel}
              </a>
              <a href={brand.appUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-brand">
                Log in
              </a>
            </p>
          </footer>
        </div>
      </main>

      {/* Mobile quick-action bar */}
      <nav
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a
            href={brand.phoneLink}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-surface text-sm font-semibold text-ink"
          >
            <Phone className="h-4 w-4 text-brand" aria-hidden="true" />
            Call
          </a>
          <a
            href={whatsappLink("Hi WALOOP, I'd like to know more about your platform.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-whatsapp text-sm font-semibold text-white"
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp
          </a>
          <a
            href="#book-demo"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-semibold text-white"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Book
          </a>
        </div>
      </nav>
    </div>
  );
}
