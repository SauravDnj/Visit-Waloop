"use client";

import { cloneElement, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CalendarCheck2,
  Check,
  Clock,
  Loader2,
  Mail,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
  Video,
} from "lucide-react";
import { whatsappLink } from "@/lib/config";
import { formatLongDate, formatTime, slotMinutes, type Slot } from "@/lib/slots";
import { WhatsAppIcon } from "./icons";

const INTERESTS = ["WhatsApp API", "Chatbots", "Conversational CRM", "Workflows", "Payments", "AI Agents"];

type Form = { name: string; email: string; phone: string; company: string; message: string };
type FieldErrors = Partial<Record<keyof Form, string>>;
type Result = { start: string; meetLink: string; demoMode: boolean; name: string; email: string };

const emptyForm: Form = { name: "", email: "", phone: "", company: "", message: "" };

function dateParts(key: string) {
  const d = new Date(`${key}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { ...o, timeZone: "UTC" }).format(d);
  return { weekday: f({ weekday: "short" }), day: f({ day: "numeric" }), month: f({ month: "short" }) };
}

function relativeLabel(key: string) {
  const todayIst = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const tomorrow = new Date(`${todayIst}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (key === todayIst) return "Today";
  if (key === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  return null;
}

/** "That's 5:30 AM in your time (Europe/London)" when the visitor isn't on IST. */
function localTimeHint(iso: string) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const d = new Date(iso);
  const local = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  const ist = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
  if (local === ist) return null;
  const localDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(d);
  return `${localDay}, ${local} your time (${tz.replace(/_/g, " ")})`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const groups = [
  { key: "morning", label: "Morning", icon: Sunrise, test: (m: number) => m < 12 * 60 },
  { key: "afternoon", label: "Afternoon", icon: Sun, test: (m: number) => m >= 12 * 60 && m < 16 * 60 },
  { key: "evening", label: "Evening", icon: Sunset, test: (m: number) => m >= 16 * 60 },
];

export function BookingWidget() {
  const [dates, setDates] = useState<string[] | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [datesError, setDatesError] = useState("");

  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [interests, setInterests] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const timesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();

  const scrollTo = (el: HTMLElement | null) =>
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });

  // Load bookable dates once.
  useEffect(() => {
    fetch("/api/slots")
      .then((r) => r.json())
      .then((d: { dates: string[]; demoMode: boolean }) => {
        setDates(d.dates);
        setDemoMode(d.demoMode);
        if (d.dates.length) setDate(d.dates[0]);
      })
      .catch(() => setDatesError("Couldn't load available dates. Please refresh the page."));
  }, []);

  const loadSlots = useCallback(async (key: string) => {
    setSlotsLoading(true);
    setSlotsError("");
    setSlots(null);
    try {
      const res = await fetch(`/api/slots?date=${key}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots);
      setDemoMode(data.demoMode);
    } catch (e) {
      setSlotsError(e instanceof Error && e.message ? e.message : "Couldn't load times. Please try again.");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching slots when the chosen date changes
    if (date) loadSlots(date);
  }, [date, loadSlots]);

  function pickDate(key: string) {
    if (key === date) return;
    setDate(key);
    setSlot(null);
    setSubmitError("");
    requestAnimationFrame(() => scrollTo(timesRef.current));
  }

  function pickSlot(s: Slot) {
    setSlot(s);
    setSubmitError("");
    requestAnimationFrame(() => scrollTo(formRef.current));
  }

  function update<K extends keyof Form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = "Please enter a valid email address.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) errs.phone = "Please enter a valid phone number.";
    return errs;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || submitting) return;

    const errs = validate();
    setFieldErrors(errs);
    const firstError = (Object.keys(errs) as (keyof Form)[])[0];
    if (firstError) {
      document.getElementById(`${uid}-${firstError}`)?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, interests, start: slot.start, website: honeypot }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        if (data.code === "slot" && date) {
          setSlot(null);
          loadSlots(date);
          requestAnimationFrame(() => scrollTo(timesRef.current));
        }
        return;
      }
      setResult({
        start: data.start,
        meetLink: data.meetLink,
        demoMode: data.demoMode,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      requestAnimationFrame(() => {
        successRef.current?.focus();
        scrollTo(successRef.current);
      });
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setSlot(null);
    setForm(emptyForm);
    setInterests([]);
    setFieldErrors({});
    if (date) loadSlots(date);
  }

  // ---------- success ----------
  if (result) {
    const dateKey = result.start.slice(0, 10);
    const time = formatTime(slotMinutes(result.start));
    const hint = localTimeHint(result.start);
    const waText = `Hi WALOOP, I've booked a demo for ${formatLongDate(dateKey)} at ${time} IST. Name: ${result.name}.`;

    return (
      <div className="animate-rise p-6 sm:p-8" role="status">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green/15 text-green-text">
          <CalendarCheck2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 ref={successRef} tabIndex={-1} className="mt-5 text-2xl font-bold text-ink outline-none sm:text-3xl">
          You&apos;re booked, {result.name.split(" ")[0]}!
        </h3>
        <p className="mt-2 text-muted">Your WALOOP demo is confirmed. We look forward to meeting you.</p>

        <dl className="mt-6 grid gap-3 rounded-2xl border bg-surface-alt/60 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Date</dt>
            <dd className="mt-1 font-semibold text-ink">{formatLongDate(dateKey)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Time</dt>
            <dd className="mt-1 font-semibold text-ink">{time} IST · 30 min</dd>
            {hint && <dd className="mt-0.5 text-sm text-muted">{hint}</dd>}
          </div>
        </dl>

        <ul className="mt-5 space-y-3 text-[15px] text-ink">
          <li className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <span>
              Calendar invite with the Google Meet link sent to <strong className="font-semibold">{result.email}</strong>
            </span>
          </li>
          <li className="flex gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <span>We&apos;ll email you a reminder a day before and an hour before the demo</span>
          </li>
        </ul>

        {result.demoMode && (
          <p className="mt-5 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Preview mode: Google Calendar isn&apos;t connected yet, so no real invite was sent.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {result.meetLink && !result.demoMode && (
            <a
              href={result.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-white shadow-[var(--shadow-brand)] transition-colors duration-200 hover:bg-brand-dark"
            >
              <Video className="h-5 w-5" aria-hidden="true" />
              Google Meet link
            </a>
          )}
          <a
            href={whatsappLink(waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 font-semibold text-white transition-[filter] duration-200 hover:brightness-110"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Confirm on WhatsApp
          </a>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong px-5 font-semibold text-ink transition-colors duration-200 hover:border-brand hover:text-brand"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Book another
          </button>
        </div>
      </div>
    );
  }

  // ---------- booking flow ----------
  const step = slot ? 3 : date ? 2 : 1;
  const hint = slot ? localTimeHint(slot.start) : null;
  const availableCount = slots?.filter((s) => s.available).length ?? 0;

  return (
    <div className="p-5 sm:p-8">
      {demoMode && (
        <p className="mb-5 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Preview mode: connect Google Calendar (see README) to send real Meet invites.
        </p>
      )}

      {/* Step indicator */}
      <ol className="mb-7 grid grid-cols-3 gap-2" aria-label="Booking steps">
        {["Date", "Time", "Details"].map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex flex-col gap-2">
              <span
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  done || current ? "bg-gradient-brand" : "bg-surface-alt"
                }`}
              />
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${done || current ? "text-ink" : "text-muted"}`}>
                {done ? (
                  <Check className="h-4 w-4 text-green-text" aria-hidden="true" />
                ) : (
                  <span className="text-muted">{n}.</span>
                )}
                {label}
                {done && <span className="sr-only">(done)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {/* 1. Date */}
      <fieldset>
        <legend className="flex w-full items-baseline justify-between gap-2 font-heading text-lg font-semibold text-ink">
          Choose a date
          <span className="font-sans text-sm font-medium text-muted">Mon – Sat</span>
        </legend>

        {datesError && <p className="mt-3 text-sm text-danger">{datesError}</p>}

        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {dates === null && !datesError
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-[76px] animate-pulse rounded-xl bg-surface-alt" aria-hidden="true" />
              ))
            : dates?.map((key) => {
                const p = dateParts(key);
                const selected = key === date;
                const rel = relativeLabel(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickDate(key)}
                    aria-pressed={selected}
                    aria-label={formatLongDate(key)}
                    className={`flex min-h-[76px] flex-col items-center justify-center rounded-xl border px-1 py-2 transition-[color,background-color,border-color,box-shadow] duration-200 ${
                      selected
                        ? "border-brand bg-brand text-white shadow-[var(--shadow-brand)]"
                        : "bg-surface text-ink hover:border-brand hover:bg-brand/5"
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-white/85" : "text-muted"}`}>
                      {rel ?? p.weekday}
                    </span>
                    <span className="font-heading text-xl font-bold leading-tight">{p.day}</span>
                    <span className={`text-xs ${selected ? "text-white/85" : "text-muted"}`}>{p.month}</span>
                  </button>
                );
              })}
        </div>
      </fieldset>

      {/* 2. Time */}
      <div ref={timesRef} className="mt-8 scroll-mt-4">
        <fieldset aria-busy={slotsLoading}>
          <legend className="flex w-full flex-wrap items-baseline justify-between gap-x-2 font-heading text-lg font-semibold text-ink">
            Pick a time
            <span className="flex items-center gap-1 font-sans text-sm font-medium text-muted">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              IST (GMT+5:30) · 30 min
            </span>
          </legend>
          {date && <p className="mt-1 text-sm text-muted">{formatLongDate(date)}</p>}

          {slotsLoading && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-alt" />
              ))}
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {slotsLoading ? "Loading available times" : slots ? `${availableCount} times available` : ""}
          </p>

          {slotsError && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{slotsError}</span>
              <button type="button" onClick={() => date && loadSlots(date)} className="font-semibold underline underline-offset-2">
                Retry
              </button>
            </div>
          )}

          {slots && !slotsLoading && availableCount === 0 && (
            <p className="mt-4 rounded-xl bg-surface-alt p-4 text-sm text-muted">
              This day is fully booked. Please choose another date.
            </p>
          )}

          {slots && !slotsLoading && availableCount > 0 && (
            <div className="mt-4 space-y-5">
              {groups.map((g) => {
                const list = slots.filter((s) => g.test(slotMinutes(s.start)));
                if (!list.length) return null;
                const Icon = g.icon;
                return (
                  <div key={g.key}>
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {g.label}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {list.map((s) => {
                        const selected = slot?.start === s.start;
                        return (
                          <button
                            key={s.start}
                            type="button"
                            disabled={!s.available}
                            onClick={() => pickSlot(s)}
                            aria-pressed={selected}
                            aria-label={s.available ? `${s.label} IST` : `${s.label} IST, already booked`}
                            className={`min-h-12 rounded-xl border px-2 text-[15px] font-semibold transition-[color,background-color,border-color,box-shadow] duration-200 ${
                              selected
                                ? "border-brand bg-brand text-white shadow-[var(--shadow-brand)]"
                                : s.available
                                  ? "bg-surface text-ink hover:border-brand hover:bg-brand/5 hover:text-brand"
                                  : "border-dashed bg-surface-alt/50 text-muted/70 line-through"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      </div>

      {/* 3. Details */}
      {slot && (
        <form ref={formRef} onSubmit={submit} noValidate className="animate-rise mt-8 scroll-mt-4">
          <h3 className="font-heading text-lg font-semibold text-ink">Your details</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 font-semibold text-brand">
              <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatLongDate(slot.start.slice(0, 10))} · {slot.label} IST
            </span>
            {hint && <span>({hint})</span>}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id={`${uid}-name`} label="Full name" required error={fieldErrors.name}>
              <input
                id={`${uid}-name`}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="e.g. Priya Sharma"
              />
            </Field>
            <Field id={`${uid}-company`} label="Company" hint="Optional">
              <input
                id={`${uid}-company`}
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                autoComplete="organization"
                maxLength={100}
                placeholder="Your business name"
              />
            </Field>
            <Field id={`${uid}-email`} label="Email" required error={fieldErrors.email} help="The Google Meet invite is sent here.">
              <input
                id={`${uid}-email`}
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                autoComplete="email"
                maxLength={120}
                placeholder="you@company.com"
              />
            </Field>
            <Field id={`${uid}-phone`} label="Phone / WhatsApp" required error={fieldErrors.phone}>
              <input
                id={`${uid}-phone`}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                autoComplete="tel"
                maxLength={20}
                placeholder="+91 98765 43210"
              />
            </Field>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-ink">
              What would you like to see? <span className="font-normal text-muted">(optional)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((item) => {
                const on = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setInterests((list) => (on ? list.filter((i) => i !== item) : [...list, item]))}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200 ${
                      on ? "border-brand bg-brand/10 text-brand" : "bg-surface text-ink hover:border-brand"
                    }`}
                  >
                    {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5">
            <Field id={`${uid}-message`} label="Anything we should know?" hint="Optional">
              <textarea
                id={`${uid}-message`}
                rows={3}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                maxLength={500}
                placeholder="Your use case, team size, current tools…"
              />
            </Field>
          </div>

          {/* Honeypot — hidden from people and assistive tech */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>

          {submitError && (
            <p role="alert" className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-[var(--shadow-brand)] transition-colors duration-200 hover:bg-brand-dark disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Scheduling your Google Meet…
              </>
            ) : (
              <>
                Confirm demo booking
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Free · No obligation · We&apos;ll only use your details to arrange this demo.
          </p>
        </form>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  help?: string;
  error?: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
}) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  const className = `w-full rounded-xl border bg-surface px-3.5 py-3 text-base text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 ${
    error ? "border-danger" : "border-line-strong"
  }`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink">
        <span>
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </span>
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </label>
      {cloneElement(children, {
        className,
        required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {help && !error && (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-sm text-danger">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
