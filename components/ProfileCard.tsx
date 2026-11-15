import Image from "next/image";
import { ArrowUpRight, CalendarDays, Globe, Mail, Phone, UserPlus } from "lucide-react";
import { brand, socials, whatsappLink } from "@/lib/config";
import { SocialIcon, WhatsAppIcon } from "./icons";
import { IntroVideo } from "./IntroVideo";

const contactRows = [
  {
    href: brand.phoneLink,
    label: "Call us",
    value: brand.phone,
    icon: <Phone className="h-5 w-5" aria-hidden="true" />,
    tone: "bg-brand/10 text-brand",
    external: false,
  },
  {
    href: whatsappLink("Hi WALOOP, I'd like to know more about your platform."),
    label: "WhatsApp",
    value: brand.whatsapp,
    icon: <WhatsAppIcon className="h-5 w-5" />,
    tone: "bg-green/12 text-green-text",
    external: true,
  },
  {
    href: `mailto:${brand.email}`,
    label: "Email",
    value: brand.email,
    icon: <Mail className="h-5 w-5" aria-hidden="true" />,
    tone: "bg-cyan/12 text-[#0a6f8f]",
    external: false,
  },
  {
    href: brand.website,
    label: "Website",
    value: brand.websiteLabel,
    icon: <Globe className="h-5 w-5" aria-hidden="true" />,
    tone: "bg-brand/10 text-brand",
    external: true,
  },
];

export function ProfileCard() {
  const activeSocials = socials.filter((s) => s.href);

  return (
    <section
      aria-labelledby="profile-heading"
      className="animate-rise overflow-hidden rounded-3xl border bg-surface shadow-[var(--shadow-soft)]"
    >
      {/* Brand band */}
      <div className="bg-gradient-brand relative h-24">
        <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
      </div>

      <div className="-mt-16 px-6 pb-6 sm:px-7">
        <h1 id="profile-heading" className="relative z-10 mx-auto w-fit rounded-3xl border bg-surface px-6 py-5 shadow-[var(--shadow-soft)]">
          <Image
            src="/brand/waloop-logo-light.png"
            alt="WALOOP"
            width={720}
            height={447}
            priority
            className="h-auto w-36"
          />
        </h1>

        <div className="mt-4 text-center">
          <p className="text-gradient font-heading text-lg font-semibold">{brand.tagline}</p>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{brand.description}</p>
        </div>

        <IntroVideo />

        {/* Primary actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href={brand.phoneLink}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white shadow-[var(--shadow-brand)] transition-colors duration-200 hover:bg-brand-dark"
          >
            <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            Call now
          </a>
          <a
            href={whatsappLink("Hi WALOOP, I'd like to know more about your platform.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 font-semibold text-white transition-[filter] duration-200 hover:brightness-110"
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            WhatsApp
          </a>
          <a
            href="#book-demo"
            className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-semibold text-ink transition-colors duration-200 hover:border-brand hover:text-brand"
          >
            <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />
            Book a free demo
          </a>
        </div>

        {/* Contact details */}
        <ul className="mt-6 divide-y rounded-2xl border">
          {contactRows.map((row) => (
            <li key={row.label}>
              <a
                href={row.href}
                {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-alt"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${row.tone}`}>
                  {row.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{row.label}</span>
                  <span className="block truncate font-semibold text-ink">{row.value}</span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>

        {/* Socials */}
        {activeSocials.length > 0 && (
          <div className="mt-6">
            <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-muted">Follow WALOOP</h2>
            <ul className="mt-3 flex flex-wrap justify-center gap-2.5">
              {activeSocials.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WALOOP on ${s.label}`}
                    title={s.label}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border bg-surface text-ink transition-colors duration-200 hover:border-brand hover:bg-brand hover:text-white"
                  >
                    <SocialIcon social={s.key} className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a
          href="/api/vcard"
          download="WALOOP.vcf"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-alt px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-[#e3eaf4]"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Save contact to phone
        </a>
      </div>
    </section>
  );
}
