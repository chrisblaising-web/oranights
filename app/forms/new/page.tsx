"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type BuilderField = {
  id: string;
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
  placeholder: string;
  is_required: boolean;
  optionsText: string;
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

function createStarterFields(): BuilderField[] {
  return [
    {
      id: createId(),
      field_key: "name",
      label: "Full Name",
      field_type: "text",
      placeholder: "John Doe",
      is_required: true,
      optionsText: "",
    },
    {
      id: createId(),
      field_key: "phone",
      label: "Phone Number",
      field_type: "phone",
      placeholder: "+1 514 555 1234",
      is_required: true,
      optionsText: "",
    },
    {
      id: createId(),
      field_key: "email",
      label: "Email",
      field_type: "email",
      placeholder: "john@example.com",
      is_required: true,
      optionsText: "",
    },
    {
      id: createId(),
      field_key: "instagram",
      label: "Instagram",
      field_type: "text",
      placeholder: "@username",
      is_required: false,
      optionsText: "",
    },
  ];
}

export default function NewFormPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formType, setFormType] = useState("raffle");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "You are entered. We will contact the winner by SMS or email."
  );
  const [submitButtonText, setSubmitButtonText] =
    useState("Enter Giveaway");
  const [tagsText, setTagsText] = useState(
    "Afro, Raffle Entrant"
  );
  const [fields, setFields] =
    useState<BuilderField[]>(createStarterFields);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const previewSlug = useMemo(() => {
    return makeSlug(slug || name || "new-form");
  }, [slug, name]);

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

  function addPreset(
    key: string,
    label: string,
    type: BuilderField["field_type"],
    placeholder = ""
  ) {
    const alreadyExists = fields.some(
      (field) => field.field_key === key
    );

    if (alreadyExists) {
      setStatus(`${label} is already included.`);
      return;
    }

    setFields((currentFields) => [
      ...currentFields,
      {
        id: createId(),
        field_key: key,
        label,
        field_type: type,
        placeholder,
        is_required: false,
        optionsText: "",
      },
    ]);

    setStatus("");
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

      const nextIndex =
        direction === "up" ? index - 1 : index + 1;

      if (
        nextIndex < 0 ||
        nextIndex >= currentFields.length
      ) {
        return currentFields;
      }

      const nextFields = [...currentFields];

      [nextFields[index], nextFields[nextIndex]] = [
        nextFields[nextIndex],
        nextFields[index],
      ];

      return nextFields;
    });
  }

  async function createForm() {
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

    if (fields.length === 0) {
      setStatus("Add at least one field.");
      return;
    }

    const invalidField = fields.find(
      (field) =>
        !field.label.trim() ||
        !makeFieldKey(
          field.field_key || field.label
        )
    );

    if (invalidField) {
      setStatus(
        "Every field needs a label and field key."
      );
      return;
    }

    const fieldKeys = fields.map((field) =>
      makeFieldKey(field.field_key || field.label)
    );

    const uniqueFieldKeys = new Set(fieldKeys);

    if (uniqueFieldKeys.size !== fieldKeys.length) {
      setStatus(
        "Each form field must have a unique field key."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/forms/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            slug: previewSlug,
            form_type: formType,
            title: title.trim(),
            description: description.trim(),
            success_message: successMessage.trim(),
            submit_button_text:
              submitButtonText.trim(),
            tags_to_apply: tagsText
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            fields: fields.map(
              (field, index) => ({
                field_key: makeFieldKey(
                  field.field_key || field.label
                ),
                label: field.label.trim(),
                field_type: field.field_type,
                placeholder:
                  field.placeholder.trim(),
                is_required:
                  field.is_required,
                options:
                  field.field_type === "select"
                    ? field.optionsText
                        .split(",")
                        .map((option) =>
                          option.trim()
                        )
                        .filter(Boolean)
                    : [],
                sort_order: index + 1,
              })
            ),
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            "The form could not be created."
        );
      }

      router.push("/forms");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "The form could not be created."
      );
    } finally {
      setSaving(false);
    }
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
              Create Form
            </h1>

            <p className="mt-2 max-w-2xl text-zinc-400">
              Build a raffle, giveaway, RSVP,
              presale, VIP request, or custom lead
              capture form.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void createForm()}
            disabled={saving}
            className="rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Creating..."
              : "Create Form"}
          </button>
        </div>

        {status && (
          <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
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
                  <label
                    htmlFor="form-name"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Internal form name
                  </label>

                  <input
                    id="form-name"
                    value={name}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      setName(value);

                      if (
                        !slug ||
                        slug === makeSlug(name)
                      ) {
                        setSlug(makeSlug(value));
                      }
                    }}
                    placeholder="Afro Event Ticket Giveaway"
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="form-type"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Form type
                  </label>

                  <select
                    id="form-type"
                    value={formType}
                    onChange={(event) =>
                      setFormType(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  >
                    <option value="raffle">
                      Raffle
                    </option>

                    <option value="giveaway">
                      Giveaway
                    </option>

                    <option value="rsvp">
                      RSVP
                    </option>

                    <option value="waitlist">
                      Waitlist
                    </option>

                    <option value="presale">
                      Presale
                    </option>

                    <option value="vip">
                      VIP Request
                    </option>

                    <option value="artist">
                      Artist Campaign
                    </option>

                    <option value="custom">
                      Custom
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="public-title"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Public form title
                  </label>

                  <input
                    id="public-title"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder="Win 2 Tickets"
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Description
                  </label>

                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Enter for a chance to win two tickets to our next Afro event."
                    className="h-28 w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="slug"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Public slug
                  </label>

                  <input
                    id="slug"
                    value={slug}
                    onChange={(event) =>
                      setSlug(
                        makeSlug(
                          event.target.value
                        )
                      )
                    }
                    placeholder="afro-ticket-giveaway"
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    Public URL: /f/{previewSlug}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tags"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Tags to apply
                  </label>

                  <input
                    id="tags"
                    value={tagsText}
                    onChange={(event) =>
                      setTagsText(
                        event.target.value
                      )
                    }
                    placeholder="Afro, Raffle Entrant"
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />

                  <p className="mt-2 text-xs text-zinc-500">
                    Separate tags with commas.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="submit-button"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Submit button
                  </label>

                  <input
                    id="submit-button"
                    value={submitButtonText}
                    onChange={(event) =>
                      setSubmitButtonText(
                        event.target.value
                      )
                    }
                    placeholder="Enter Giveaway"
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="success-message"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Success message
                  </label>

                  <input
                    id="success-message"
                    value={successMessage}
                    onChange={(event) =>
                      setSuccessMessage(
                        event.target.value
                      )
                    }
                    placeholder="Thank you. You are entered."
                    className="w-full rounded-lg bg-zinc-900 p-4 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-bold">
                    Form fields
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Choose what information this
                    campaign collects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addField}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-700"
                >
                  Add Custom Field
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    addPreset(
                      "birthday",
                      "Birthday",
                      "date"
                    )
                  }
                  className="rounded-full border border-white/10 px-3 py-2 text-xs transition hover:bg-white/5"
                >
                  + Birthday
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addPreset(
                      "city",
                      "City",
                      "text",
                      "Montreal"
                    )
                  }
                  className="rounded-full border border-white/10 px-3 py-2 text-xs transition hover:bg-white/5"
                >
                  + City
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addPreset(
                      "favorite_artist",
                      "Favorite Artist",
                      "text",
                      "Artist name"
                    )
                  }
                  className="rounded-full border border-white/10 px-3 py-2 text-xs transition hover:bg-white/5"
                >
                  + Favorite Artist
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addPreset(
                      "guest_name",
                      "Who Would You Bring?",
                      "text",
                      "Friend name"
                    )
                  }
                  className="rounded-full border border-white/10 px-3 py-2 text-xs transition hover:bg-white/5"
                >
                  + Guest Name
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addPreset(
                      "marketing_consent",
                      "I agree to receive event updates",
                      "checkbox"
                    )
                  }
                  className="rounded-full border border-white/10 px-3 py-2 text-xs transition hover:bg-white/5"
                >
                  + Marketing Consent
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {fields.map((field, index) => (
                  <article
                    key={field.id}
                    className="rounded-xl border border-white/10 bg-black p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-semibold">
                        Field {index + 1}
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveField(
                              field.id,
                              "up"
                            )
                          }
                          className="rounded bg-zinc-900 px-3 py-1 text-xs disabled:opacity-30"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          disabled={
                            index ===
                            fields.length - 1
                          }
                          onClick={() =>
                            moveField(
                              field.id,
                              "down"
                            )
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
                          className="text-sm text-red-400 transition hover:text-red-300"
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
                            label:
                              event.target.value,
                            field_key:
                              field.field_key ||
                              makeFieldKey(
                                event.target.value
                              ),
                          })
                        }
                        placeholder="Public label"
                        className="rounded-lg bg-zinc-900 p-3 outline-none ring-blue-500 focus:ring-2"
                      />

                      <input
                        value={field.field_key}
                        onChange={(event) =>
                          updateField(field.id, {
                            field_key:
                              makeFieldKey(
                                event.target.value
                              ),
                          })
                        }
                        placeholder="Database key"
                        className="rounded-lg bg-zinc-900 p-3 outline-none ring-blue-500 focus:ring-2"
                      />

                      <select
                        value={field.field_type}
                        onChange={(event) =>
                          updateField(field.id, {
                            field_type:
                              event.target
                                .value as BuilderField["field_type"],
                          })
                        }
                        className="rounded-lg bg-zinc-900 p-3 outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="text">
                          Text
                        </option>

                        <option value="email">
                          Email
                        </option>

                        <option value="phone">
                          Phone
                        </option>

                        <option value="date">
                          Date
                        </option>

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
                        className="rounded-lg bg-zinc-900 p-3 outline-none ring-blue-500 focus:ring-2"
                      />

                      {field.field_type ===
                        "select" && (
                        <input
                          value={field.optionsText}
                          onChange={(event) =>
                            updateField(field.id, {
                              optionsText:
                                event.target.value,
                            })
                          }
                          placeholder="Options separated by commas"
                          className="rounded-lg bg-zinc-900 p-3 outline-none ring-blue-500 focus:ring-2 md:col-span-2"
                        />
                      )}

                      <label className="flex items-center gap-3 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={
                            field.is_required
                          }
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
              Public preview
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              {title || "Your Form Title"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {description ||
                "Your form description will appear here."}
            </p>

            <div className="mt-6 space-y-4">
              {fields.map((field) => (
                <div key={field.id}>
                  {field.field_type ===
                  "checkbox" ? (
                    <label className="flex items-start gap-3 rounded-lg bg-black p-3 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        disabled
                        className="mt-1"
                      />

                      <span>
                        {field.label ||
                          "Checkbox"}

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
                        {field.label ||
                          "Field label"}

                        {field.is_required && (
                          <span className="ml-1 text-red-400">
                            *
                          </span>
                        )}
                      </label>

                      {field.field_type ===
                      "textarea" ? (
                        <textarea
                          disabled
                          placeholder={
                            field.placeholder
                          }
                          className="h-24 w-full rounded-lg bg-black p-3 text-sm"
                        />
                      ) : field.field_type ===
                        "select" ? (
                        <select
                          disabled
                          className="w-full rounded-lg bg-black p-3 text-sm"
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
                            field.field_type ===
                            "phone"
                              ? "tel"
                              : field.field_type
                          }
                          placeholder={
                            field.placeholder
                          }
                          className="w-full rounded-lg bg-black p-3 text-sm"
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

            <p className="mt-5 break-all text-xs text-zinc-500">
              Public link: /f/{previewSlug}
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}