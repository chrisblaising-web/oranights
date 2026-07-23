"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type CampaignForm = {
  id: number;
  name: string;
  title: string;
  slug: string;
  form_type: string;
};

type Submission = {
  id: number;
  guest_id: number | null;
  data: Record<string, unknown>;
  source_url: string | null;
  created_at: string;
};

type FormField = {
  id: number;
  field_key: string;
  label: string;
  sort_order: number;
};

export default function FormSubmissionsPage() {
  const params = useParams<{ id: string }>();
  const formId = Number(params?.id);

  const [form, setForm] = useState<CampaignForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  async function loadSubmissions() {
    if (!formId || Number.isNaN(formId)) {
      setStatus("Invalid form ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const { data: formData, error: formError } =
        await supabase
          .from("forms")
          .select("id,name,title,slug,form_type")
          .eq("id", formId)
          .maybeSingle();

      if (formError) {
        throw new Error(formError.message);
      }

      if (!formData) {
        setStatus("Form not found.");
        return;
      }

      setForm(formData as CampaignForm);

      const { data: fieldData, error: fieldError } =
        await supabase
          .from("form_fields")
          .select("id,field_key,label,sort_order")
          .eq("form_id", formId)
          .order("sort_order", {
            ascending: true,
          });

      if (fieldError) {
        throw new Error(fieldError.message);
      }

      setFields((fieldData as FormField[]) || []);

      const { data: submissionData, error: submissionError } =
        await supabase
          .from("form_submissions")
          .select(
            `
              id,
              guest_id,
              data,
              source_url,
              created_at
            `
          )
          .eq("form_id", formId)
          .order("created_at", {
            ascending: false,
          });

      if (submissionError) {
        throw new Error(submissionError.message);
      }

      setSubmissions(
        (submissionData as Submission[]) || []
      );
    } catch (error) {
      console.error("Unable to load submissions:", error);

      setStatus(
        error instanceof Error
          ? error.message
          : "Submissions could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubmissions();
  }, [formId]);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return submissions;
    }

    return submissions.filter((submission) => {
      const values = Object.values(submission.data || {});

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [search, submissions]);

  function formatValue(value: unknown) {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return String(value);
  }

  function downloadCsv() {
    if (!form || submissions.length === 0) {
      setStatus("There are no submissions to export.");
      return;
    }

    const headers = [
      "Submission ID",
      "Guest ID",
      ...fields.map((field) => field.label),
      "Source URL",
      "Submitted At",
    ];

    const rows = submissions.map((submission) => [
      submission.id,
      submission.guest_id ?? "",
      ...fields.map((field) =>
        formatValue(submission.data?.[field.field_key])
      ),
      submission.source_url ?? "",
      new Date(submission.created_at).toLocaleString(),
    ]);

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        row.map(escapeCsv).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${form.slug}-submissions.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setStatus("CSV export downloaded.");
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
              {form?.name || "Form Submissions"}
            </h1>

            <p className="mt-2 text-zinc-400">
              View raffle entries, RSVPs, presale signups,
              and lead data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {form && (
              <Link
                href={`/f/${form.slug}`}
                target="_blank"
                className="rounded-lg bg-zinc-800 px-5 py-3 font-semibold transition hover:bg-zinc-700"
              >
                Open Public Form
              </Link>
            )}

            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              Export CSV
            </button>
          </div>
        </div>

        {status && (
          <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
            {status}
          </p>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              Total submissions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {submissions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              Linked guests
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                submissions.filter(
                  (submission) => submission.guest_id
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">
              Form type
            </p>

            <p className="mt-2 text-2xl font-bold capitalize">
              {form?.form_type || "—"}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">
                Entries
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Search by name, phone, email, Instagram,
                city, or any custom answer.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search submissions..."
              className="w-full rounded-lg bg-zinc-900 p-3 outline-none ring-blue-500 focus:ring-2 md:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl bg-zinc-900"
                />
              ))}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-12 text-center">
              <div className="text-4xl">📋</div>

              <h3 className="mt-4 text-xl font-bold">
                No submissions found
              </h3>

              <p className="mt-2 text-zinc-400">
                Fill out the public form once to test the
                complete flow.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-6"
                >
                  <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 md:flex-row md:items-center">
                    <div>
                      <p className="font-semibold">
                        Submission #{submission.id}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {new Date(
                          submission.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    {submission.guest_id ? (
                      <Link
                        href="/guests"
                        className="text-sm font-semibold text-green-300 hover:text-green-200"
                      >
                        Guest linked #{submission.guest_id}
                      </Link>
                    ) : (
                      <span className="text-sm text-amber-300">
                        No guest linked
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-xl bg-black p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {field.label}
                        </p>

                        <p className="mt-2 break-words text-sm text-white">
                          {formatValue(
                            submission.data?.[field.field_key]
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  {submission.source_url && (
                    <p className="mt-5 break-all text-xs text-zinc-600">
                      Source: {submission.source_url}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}