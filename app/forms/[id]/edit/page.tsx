"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type EventOption = {
  id: number;
  name: string;
  venue: string | null;
  event_date: string;
  is_active: boolean;
};

type FieldType =
  | "text"
  | "email"
  | "phone"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";

type BuilderField = {
  id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  placeholder: string;
  is_required: boolean;
  optionsText: string;
};

type FormRecord = {
  id: number;
  name: string;
  slug: string;
  form_type: string;
  title: string;
  description: string | null;
  success_message: string | null;
  submit_button_text: string | null;
  tags_to_apply: string[] | null;
  is_active: boolean;
  event_id: number | null;
};

type FormFieldRecord = {
  id: number;
  field_key: string;
  label: string;
  field_type: FieldType;
  placeholder: string | null;
  is_required: boolean;
  options: string[] | null;
  sort_order: number;
};

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeFieldKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function EditFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const formId = Number(params?.id);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formType, setFormType] = useState("custom");
  const [eventId, setEventId] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitButtonText, setSubmitButtonText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [fields, setFields] = useState<BuilderField[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const previewSlug = useMemo(() => {
    return makeSlug(slug || name || "form");
  }, [slug, name]);

  useEffect(() => {
    if (!formId || Number.isNaN(formId)) {
      setStatus("Invalid form ID.");
      setLoading(false);
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
                name,
                slug,
                form_type,
                title,
                description,
                success_message,
                submit_button_text,
                tags_to_apply,
                is_active,
                event_id
              `
            )
            .eq("id", formId)
            .maybeSingle();

        if (formError) {
          throw new Error(formError.message);
        }

        if (!formData) {
          setStatus("Form not found.");
          return;
        }

        const loadedForm = formData as FormRecord;

        setName(loadedForm.name);
        setSlug(loadedForm.slug);
        setFormType(loadedForm.form_type);
        setTitle(loadedForm.title);
        setDescription(loadedForm.description || "");
        setSuccessMessage(loadedForm.success_message || "");
        setSubmitButtonText(
          loadedForm.submit_button_text || "Submit"
        );
        setTagsText(
          Array.isArray(loadedForm.tags_to_apply)
            ? loadedForm.tags_to_apply.join(", ")
            : ""
        );
        setIsActive(loadedForm.is_active);
        setEventId(
          loadedForm.event_id
            ? String(loadedForm.event_id)
            : ""
        );

        const { data: eventData, error: eventError } =
          await supabase
            .from("events")
            .select("id,name,venue,event_date,is_active")
            .order("event_date", {
              ascending: false,
            });

        if (eventError) {
          throw new Error(eventError.message);
        }

        setEvents(
          (eventData as EventOption[]) ?? []
        );

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
            .eq("form_id", formId)
            .order("sort_order", {
              ascending: true,
            });

        if (fieldError) {
          throw new Error(fieldError.message);
        }

        const loadedFields =
          (fieldData as FormFieldRecord[]) || [];

        setFields(
          loadedFields.map((field) => ({
            id: String(field.id),
            field_key: field.field_key,
            label: field.label,
            field_type: field.field_type,
            placeholder: field.placeholder || "",
            is_required: field.is_required,
            optionsText: Array.isArray(field.options)
              ? field.options.join(", ")
              : "",
          }))
        );
      } catch (error) {
        console.error("Unable to load form:", error);

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
  }, [formId]);

  function updateField(
    id: string,
    updates: Partial<BuilderField>
  ) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === id
          ? {
            ...field,
            ...updates,
          }
          : field
      )
    );
  }

  function addField() {
    setFields((currentFields) => [
      ...currentFields,
      {
        id: createId(),
        field_key: "",
        label: "",
        field_type: "text",
        placeholder: "",
        is_required: false,
        optionsText: "",
      },
    ]);
  }

  function removeField(id: string) {
    setFields((currentFields) =>
      currentFields.filter((field) => field.id !== id)
    );
  }

  function moveField(id: string, direction: "up" | "down") {
    setFields((currentFields) => {
      const index = currentFields.findIndex(
        (field) => field.id === id
      );

      if (index === -1) {
        return currentFields;
      }

      const newIndex =
        direction === "up" ? index - 1 : index + 1;

      if (
        newIndex < 0 ||
        newIndex >= currentFields.length
      ) {
        return currentFields;
      }

      const nextFields = [...currentFields];

      [nextFields[index], nextFields[newIndex]] = [
        nextFields[newIndex],
        nextFields[index],
      ];

      return nextFields;
    });
  }

  async function saveForm() {
    setStatus("");

    if (!name.trim()) {
      setStatus("Enter an internal form name.");
      return;
    }

    if (!title.trim()) {
      setStatus("Enter the public form title.");
      return;
    }

    if (!previewSlug) {
      setStatus("Enter a valid public slug.");
      return;
    }

    if (!eventId) {
      setStatus("Select the event connected to this form.");
      return;
    }

    if (fields.length === 0) {
      setStatus("Add at least one field.");
      return;
    }

    const normalizedFields = fields.map(
      (field, index) => ({
        field_key: makeFieldKey(
          field.field_key || field.label
        ),
        label: field.label.trim(),
        field_type: field.field_type,
        placeholder: field.placeholder.trim(),
        is_required: field.is_required,
        options:
          field.field_type === "select"
            ? field.optionsText
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean)
            : [],
        sort_order: index + 1,
      })
    );

    const invalidField = normalizedFields.find(
      (field) => !field.field_key || !field.label
    );

    if (invalidField) {
      setStatus(
        "Every field needs a label and field key."
      );
      return;
    }

    const fieldKeys = normalizedFields.map(
      (field) => field.field_key
    );

    if (
      new Set(fieldKeys).size !== fieldKeys.length
    ) {
      setStatus(
        "Each form field must have a unique field key."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            slug: previewSlug,
            form_type: formType,
            event_id: Number(eventId),
            title: title.trim(),
            description: description.trim(),
            success_message: successMessage.trim(),
            submit_button_text:
              submitButtonText.trim(),
            tags_to_apply: tagsText
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            is_active: isActive,
            fields: normalizedFields,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
          "The form could not be updated."
        );
      }

      setStatus("Form updated successfully.");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The form could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <Sidebar />

        <main className="flex-1 p-10">
          <div className="h-10 w-64 animate-pulse rounded bg-zinc-900" />

          <div className="mt-8 space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-zinc-900"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 md:p-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <Link
              href="/forms"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              ← Campaign Forms
            </Link>

            <h1 className="mt-4 text-4xl font-bold">
              Edit Form
            </h1>

            <p className="mt-2 text-zinc-400">
              Update the form information, fields, tags,
              and public settings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/f/${previewSlug}`}
              target="_blank"
              className="rounded-lg bg-zinc-800 px-5 py-3 font-semibold transition hover:bg-zinc-700"
            >
              Preview
            </Link>

            <button
              type="button"
              onClick={() => void saveForm()}
              disabled={saving}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {status && (
          <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
            {status}
          </p>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-xl font-bold">
                Form details
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Internal form name
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Form type
                  </label>

                  <select
                    value={formType}
                    onChange={(event) =>
                      setFormType(event.target.value)
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  >
                    <option value="raffle">Raffle</option>
                    <option value="giveaway">Giveaway</option>
                    <option value="rsvp">RSVP</option>
                    <option value="waitlist">Waitlist</option>
                    <option value="presale">Presale</option>
                    <option value="vip">VIP Request</option>
                    <option value="artist">
                      Artist Campaign
                    </option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">
                    Connected event
                  </label>

                  <select
                    value={eventId}
                    onChange={(event) =>
                      setEventId(event.target.value)
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  >
                    <option value="">
                      Select an event
                    </option>

                    {events.map((event) => (
                      <option
                        key={event.id}
                        value={event.id}
                      >
                        {event.name}
                        {event.venue
                          ? ` — ${event.venue}`
                          : ""}
                        {event.is_active
                          ? " (Active)"
                          : ""}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-zinc-500">
                    New submissions will be added to this event.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">
                    Public title
                  </label>

                  <input
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-zinc-400">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    className="h-28 w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Public slug
                  </label>

                  <input
                    value={slug}
                    onChange={(event) =>
                      setSlug(makeSlug(event.target.value))
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    /f/{previewSlug}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Tags
                  </label>

                  <input
                    value={tagsText}
                    onChange={(event) =>
                      setTagsText(event.target.value)
                    }
                    placeholder="Afro, Raffle Entrant"
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Submit button
                  </label>

                  <input
                    value={submitButtonText}
                    onChange={(event) =>
                      setSubmitButtonText(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Success message
                  </label>

                  <input
                    value={successMessage}
                    onChange={(event) =>
                      setSuccessMessage(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-lg bg-zinc-900 p-4 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) =>
                      setIsActive(event.target.checked)
                    }
                  />

                  <span>
                    Form is active and accepting submissions
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Form fields
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Change labels, types, order, and
                    requirements.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addField}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
                >
                  Add Field
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {fields.map((field, index) => (
                  <article
                    key={field.id}
                    className="rounded-xl border border-white/10 bg-black p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">
                        Field {index + 1}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveField(field.id, "up")
                          }
                          className="rounded bg-zinc-900 px-3 py-1 text-xs disabled:opacity-30"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          disabled={
                            index === fields.length - 1
                          }
                          onClick={() =>
                            moveField(field.id, "down")
                          }
                          className="rounded bg-zinc-900 px-3 py-1 text-xs disabled:opacity-30"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeField(field.id)
                          }
                          className="text-sm text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input
                        value={field.label}
                        onChange={(event) =>
                          updateField(field.id, {
                            label: event.target.value,
                            field_key:
                              field.field_key ||
                              makeFieldKey(
                                event.target.value
                              ),
                          })
                        }
                        placeholder="Public label"
                        className="rounded-lg bg-zinc-900 p-3 outline-none"
                      />

                      <input
                        value={field.field_key}
                        onChange={(event) =>
                          updateField(field.id, {
                            field_key: makeFieldKey(
                              event.target.value
                            ),
                          })
                        }
                        placeholder="Database key"
                        className="rounded-lg bg-zinc-900 p-3 outline-none"
                      />

                      <select
                        value={field.field_type}
                        onChange={(event) =>
                          updateField(field.id, {
                            field_type:
                              event.target
                                .value as FieldType,
                          })
                        }
                        className="rounded-lg bg-zinc-900 p-3 outline-none"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="date">Date</option>
                        <option value="textarea">
                          Long Text
                        </option>
                        <option value="select">
                          Dropdown
                        </option>
                        <option value="checkbox">
                          Checkbox
                        </option>
                      </select>

                      <input
                        value={field.placeholder}
                        onChange={(event) =>
                          updateField(field.id, {
                            placeholder:
                              event.target.value,
                          })
                        }
                        placeholder="Placeholder"
                        className="rounded-lg bg-zinc-900 p-3 outline-none"
                      />

                      {field.field_type === "select" && (
                        <input
                          value={field.optionsText}
                          onChange={(event) =>
                            updateField(field.id, {
                              optionsText:
                                event.target.value,
                            })
                          }
                          placeholder="Option 1, Option 2, Option 3"
                          className="rounded-lg bg-zinc-900 p-3 outline-none md:col-span-2"
                        />
                      )}

                      <label className="flex items-center gap-3 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(event) =>
                            updateField(field.id, {
                              is_required:
                                event.target.checked,
                            })
                          }
                        />

                        Required field
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-white/10 bg-zinc-950 p-6 xl:sticky xl:top-6">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Live preview
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              {title || "Form title"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {description || "Form description"}
            </p>

            <div className="mt-6 space-y-4">
              {fields.map((field) => (
                <div key={field.id}>
                  {field.field_type === "checkbox" ? (
                    <label className="flex gap-3 rounded-lg bg-black p-3 text-sm text-zinc-400">
                      <input type="checkbox" disabled />

                      <span>
                        {field.label || "Checkbox"}

                        {field.is_required && (
                          <span className="ml-1 text-red-400">
                            *
                          </span>
                        )}
                      </span>
                    </label>
                  ) : (
                    <>
                      <label className="mb-2 block text-sm font-medium">
                        {field.label || "Field label"}

                        {field.is_required && (
                          <span className="ml-1 text-red-400">
                            *
                          </span>
                        )}
                      </label>

                      {field.field_type === "textarea" ? (
                        <textarea
                          disabled
                          placeholder={field.placeholder}
                          className="h-24 w-full rounded-lg bg-black p-3"
                        />
                      ) : field.field_type === "select" ? (
                        <select
                          disabled
                          className="w-full rounded-lg bg-black p-3"
                        >
                          <option>
                            {field.placeholder ||
                              "Select an option"}
                          </option>
                        </select>
                      ) : (
                        <input
                          disabled
                          type={
                            field.field_type === "phone"
                              ? "tel"
                              : field.field_type
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-lg bg-black p-3"
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-lg bg-white px-5 py-3 font-semibold text-black"
            >
              {submitButtonText || "Submit"}
            </button>

            <p className="mt-5 text-xs text-zinc-500">
              Status: {isActive ? "Active" : "Inactive"}
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}