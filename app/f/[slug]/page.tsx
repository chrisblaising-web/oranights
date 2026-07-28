"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventDetails = {
  id: number;
  name: string;
  venue: string | null;
  address: string | null;
  event_date: string;
  dinner_time: string | null;
  club_time: string | null;
  host_name: string | null;
};

type PublicForm = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  success_message: string | null;
  submit_button_text: string | null;
  is_active: boolean;
  event_id: number | null;
  events: EventDetails | EventDetails[] | null;
};

type PublicFormField = {
  id: number;
  field_key: string;
  label: string;
  field_type:
  | "text"
  | "email"
  | "phone"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";
  placeholder: string | null;
  is_required: boolean;
  options: string[] | null;
  sort_order: number;
};

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [fields, setFields] = useState<PublicFormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (!slug) {
      return;
    }

    async function loadForm() {
      setLoading(true);
      setStatus("");

      try {
        const { data: formData, error: formError } =
          await supabase
            .from("forms")
            .select(
              `
                id,
                slug,
                title,
                description,
                image_url,
                success_message,
                submit_button_text,
                is_active,
                event_id,
                events (
                  id,
                  name,
                  venue,
                  address,
                  event_date,
                  dinner_time,
                  club_time,
                  host_name
                )
              `
            )
            .eq("slug", slug)
            .maybeSingle();

        if (formError) {
          throw new Error(formError.message);
        }

        if (!formData) {
          setStatus("This form could not be found.");
          return;
        }

        const loadedForm = formData as PublicForm;

        if (!loadedForm.is_active) {
          setStatus(
            "This form is no longer accepting submissions."
          );
          return;
        }

        setForm(loadedForm);

        const { data: fieldData, error: fieldError } =
          await supabase
            .from("form_fields")
            .select(
              `
                id,
                field_key,
                label,
                field_type,
                placeholder,
                is_required,
                options,
                sort_order
              `
            )
            .eq("form_id", loadedForm.id)
            .order("sort_order", {
              ascending: true,
            });

        if (fieldError) {
          throw new Error(fieldError.message);
        }

        const loadedFields =
          (fieldData as PublicFormField[]) || [];

        setFields(loadedFields);

        const initialAnswers: Record<string, unknown> = {};

        for (const field of loadedFields) {
          initialAnswers[field.field_key] =
            field.field_type === "checkbox" ? false : "";
        }

        setAnswers(initialAnswers);
      } catch (error) {
        console.error("Unable to load public form:", error);

        setStatus(
          error instanceof Error
            ? error.message
            : "The form could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadForm();
  }, [slug]);

  function updateAnswer(fieldKey: string, value: unknown) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [fieldKey]: value,
    }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || !slug) {
      return;
    }

    setStatus("");

    const missingField = fields.find((field) => {
      if (!field.is_required) {
        return false;
      }

      const value = answers[field.field_key];

      if (field.field_type === "checkbox") {
        return value !== true;
      }

      return (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
      );
    });

    if (missingField) {
      setStatus(`${missingField.label} is required.`);
      return;
    }

    const hasPhoneField = fields.some(
      (field) => field.field_type === "phone"
    );

    if (hasPhoneField && !smsConsent) {
      setStatus(
        "Please confirm that you agree to receive event-related text messages."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/forms/${encodeURIComponent(slug)}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: answers,
            source_url: window.location.href,
            website,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
          "Your submission could not be saved."
        );
      }

      setSubmitted(true);

      setStatus(
        result.success_message ||
        form.success_message ||
        "Thank you. Your submission was received."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Your submission could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <div className="w-full max-w-xl animate-pulse rounded-3xl border border-white/10 bg-zinc-950 p-8">
          <div className="h-10 w-2/3 rounded bg-zinc-800" />
          <div className="mt-4 h-5 w-full rounded bg-zinc-900" />
          <div className="mt-2 h-5 w-4/5 rounded bg-zinc-900" />

          <div className="mt-8 space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <div className="h-4 w-32 rounded bg-zinc-800" />
                <div className="mt-2 h-14 rounded-xl bg-zinc-900" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center">
          <div className="text-5xl">📝</div>

          <h1 className="mt-5 text-3xl font-bold">
            Form unavailable
          </h1>

          <p className="mt-4 text-zinc-400">
            {status || "This form could not be found."}
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-green-500/20 bg-zinc-950 p-10 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-4xl">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            Submission received
          </h1>

          <p className="mt-4 leading-7 text-zinc-300">
            {status}
          </p>

          <p className="mt-6 text-sm text-zinc-500">
            Your registration was submitted directly to WKND Presents.
            Keep any confirmation message you receive for event entry.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://www.instagram.com/wknd.presents"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Official Instagram
            </a>

            <a
              href="/privacy"
              className="text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Privacy
            </a>

            <a
              href="/contact"
              className="text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Contact
            </a>
          </div>
        </div>
      </main>
    );
  }

  const connectedEvent = Array.isArray(form.events)
    ? form.events[0] ?? null
    : form.events;

  const hasPhoneField = fields.some(
    (field) => field.field_type === "phone"
  );

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
          {form.image_url && (
            <img
              src={form.image_url}
              alt={form.title}
              className="h-64 w-full object-cover"
            />
          )}

          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                  WKND Presents
                </p>

                <p className="mt-1 text-xs font-medium text-emerald-300">
                  Official event registration
                </p>
              </div>

              <a
                href="https://www.instagram.com/wknd.presents"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
              >
                @wknd.presents
              </a>
            </div>

            <h1 className="mt-4 text-3xl font-bold md:text-5xl">
              {form.title}
            </h1>

            {form.description && (
              <p className="mt-5 whitespace-pre-line leading-7 text-zinc-400">
                {form.description}
              </p>
            )}

            {connectedEvent && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Event details
                </p>

                <h2 className="mt-3 text-xl font-bold">
                  {connectedEvent.name}
                </h2>

                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>
                    📅{" "}
                    {new Date(
                      `${connectedEvent.event_date}T12:00:00`
                    ).toLocaleDateString("en-CA", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>

                  <p>
                    📍 {connectedEvent.venue || "Venue to be announced"}
                  </p>

                  {connectedEvent.address && (
                    <p className="text-zinc-500">
                      {connectedEvent.address}
                    </p>
                  )}

                  {(connectedEvent.dinner_time ||
                    connectedEvent.club_time) && (
                      <p>
                        🕒{" "}
                        {connectedEvent.dinner_time
                          ? `Dinner ${connectedEvent.dinner_time}`
                          : ""}
                        {connectedEvent.dinner_time &&
                          connectedEvent.club_time
                          ? " · "
                          : ""}
                        {connectedEvent.club_time
                          ? `Celebration ${connectedEvent.club_time}`
                          : ""}
                      </p>
                    )}

                  {connectedEvent.host_name && (
                    <p>
                      Hosted by {connectedEvent.host_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm leading-6 text-zinc-300">
              This is the official WKND Presents guest-list form.
              Information submitted here is used only for registration,
              event access, and event-related communication.
            </div>

            {status && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {status}
              </div>
            )}

            <form
              onSubmit={(event) => void submitForm(event)}
              className="mt-8 space-y-6"
            >
              <div
                aria-hidden="true"
                className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
              >
                <label htmlFor="website">
                  Website
                </label>

                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) =>
                    setWebsite(event.target.value)
                  }
                />
              </div>

              {fields.map((field) => {
                const value = answers[field.field_key];

                if (field.field_type === "checkbox") {
                  return (
                    <label
                      key={field.id}
                      className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/10 bg-black p-4"
                    >
                      <input
                        type="checkbox"
                        checked={value === true}
                        required={field.is_required}
                        onChange={(event) =>
                          updateAnswer(
                            field.field_key,
                            event.target.checked
                          )
                        }
                        className="mt-1 h-5 w-5"
                      />

                      <span className="text-sm leading-6 text-zinc-300">
                        {field.label}

                        {field.is_required && (
                          <span className="ml-1 text-red-400">
                            *
                          </span>
                        )}
                      </span>
                    </label>
                  );
                }

                return (
                  <div key={field.id}>
                    <label
                      htmlFor={`field-${field.id}`}
                      className="mb-2 block text-sm font-semibold"
                    >
                      {field.label}

                      {field.is_required && (
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      )}
                    </label>

                    {field.field_type === "textarea" ? (
                      <textarea
                        id={`field-${field.id}`}
                        value={String(value ?? "")}
                        required={field.is_required}
                        placeholder={field.placeholder || ""}
                        onChange={(event) =>
                          updateAnswer(
                            field.field_key,
                            event.target.value
                          )
                        }
                        className="min-h-32 w-full rounded-xl border border-white/10 bg-black p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    ) : field.field_type === "select" ? (
                      <select
                        id={`field-${field.id}`}
                        value={String(value ?? "")}
                        required={field.is_required}
                        onChange={(event) =>
                          updateAnswer(
                            field.field_key,
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-black p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">
                          {field.placeholder ||
                            "Select an option"}
                        </option>

                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`field-${field.id}`}
                        type={
                          field.field_type === "phone"
                            ? "tel"
                            : field.field_type
                        }
                        value={String(value ?? "")}
                        required={field.is_required}
                        placeholder={field.placeholder || ""}
                        onChange={(event) =>
                          updateAnswer(
                            field.field_key,
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-black p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                );
              })}

              {hasPhoneField && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black p-4">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    required
                    onChange={(event) =>
                      setSmsConsent(event.target.checked)
                    }
                    className="mt-1 h-5 w-5"
                  />

                  <span className="text-xs leading-5 text-zinc-400">
                    I agree to receive event-related text messages from
                    WKND Presents about this registration. Message and
                    data rates may apply. Reply STOP to unsubscribe.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-white px-6 py-4 text-lg font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Submitting..."
                  : form.submit_button_text ||
                  "Join Official Guest List"}
              </button>
            </form>
          </div>
        </section>

        <footer className="mt-6 text-center text-xs leading-6 text-zinc-500">
          <p>
            Official guest-list registration operated by WKND Presents.
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <a href="/privacy" className="hover:text-white">
              Privacy Policy
            </a>

            <a href="/terms" className="hover:text-white">
              Terms of Use
            </a>

            <a href="/contact" className="hover:text-white">
              Contact
            </a>
          </div>

          <p className="mt-2">
            © {new Date().getFullYear()} WKND Presents. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}