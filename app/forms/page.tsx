"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type CampaignForm = {
    id: number;
    name: string;
    slug: string;
    form_type: string;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    event_id: number | null;
    events:
    | {
        id: number;
        name: string;
        venue: string | null;
        event_date: string;
    }
    | {
        id: number;
        name: string;
        venue: string | null;
        event_date: string;
    }[]
    | null;
};

type SubmissionCount = {
    form_id: number;
};

export default function FormsPage() {
    const [forms, setForms] = useState<CampaignForm[]>([]);
    const [submissionCounts, setSubmissionCounts] = useState<
        Record<number, number>
    >({});
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");

    async function loadForms() {
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
                            is_active,
                            created_at,
                            event_id,
                            events (
                                id,
                                name,
                                venue,
                                event_date
                            )
                        `
                    )
                    .order("created_at", {
                        ascending: false,
                    });

            if (formError) {
                throw formError;
            }

            const loadedForms =
                (formData as CampaignForm[]) ?? [];

            setForms(loadedForms);

            const { data: submissionData, error: submissionError } =
                await supabase
                    .from("form_submissions")
                    .select("form_id");

            if (submissionError) {
                console.error(
                    "Unable to load submission counts:",
                    submissionError
                );

                setSubmissionCounts({});
                return;
            }

            const counts: Record<number, number> = {};

            for (const submission of
                (submissionData as SubmissionCount[]) ?? []) {
                counts[submission.form_id] =
                    (counts[submission.form_id] || 0) + 1;
            }

            setSubmissionCounts(counts);
        } catch (error) {
            console.error("Unable to load forms:", error);

            setStatus(
                error instanceof Error
                    ? `Forms could not be loaded: ${error.message}`
                    : "Forms could not be loaded."
            );
        } finally {
            setLoading(false);
        }
    }

    async function toggleFormStatus(
        formId: number,
        currentStatus: boolean
    ) {
        setStatus("");

        const { error } = await supabase
            .from("forms")
            .update({
                is_active: !currentStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("id", formId);

        if (error) {
            setStatus(
                `Form status could not be updated: ${error.message}`
            );
            return;
        }

        setForms((currentForms) =>
            currentForms.map((form) =>
                form.id === formId
                    ? {
                        ...form,
                        is_active: !currentStatus,
                    }
                    : form
            )
        );
    }

    async function copyPublicLink(slug: string) {
        const publicUrl = `${window.location.origin}/f/${slug}`;

        try {
            await navigator.clipboard.writeText(publicUrl);
            setStatus("Public form link copied.");
        } catch {
            setStatus(`Public form link: ${publicUrl}`);
        }
    }

    async function copyEmbedCode(slug: string) {
        const publicUrl = `${window.location.origin}/f/${slug}`;

        const embedCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="750"
  loading="lazy"
  style="border:0;width:100%;border-radius:16px;"
  title="Campaign form"
></iframe>`;

        try {
            await navigator.clipboard.writeText(embedCode);
            setStatus("Embed code copied.");
        } catch {
            setStatus("Embed code could not be copied.");
        }
    }

    async function duplicateForm(formId: number) {
        setStatus("Duplicating form...");

        try {
            const response = await fetch(
                `/api/forms/${formId}/duplicate`,
                {
                    method: "POST",
                }
            );

            const result = await response.json().catch(() => null);

            if (!response.ok || !result?.success) {
                throw new Error(
                    result?.error ||
                    "The form could not be duplicated."
                );
            }

            setStatus(
                `"${result.form.name}" was created as an inactive copy.`
            );

            await loadForms();
        } catch (error) {
            setStatus(
                error instanceof Error
                    ? error.message
                    : "The form could not be duplicated."
            );
        }
    }


    useEffect(() => {
        void loadForms();
    }, []);

    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-black text-white">
                <Sidebar />

                <main className="min-w-0 flex-1 p-6 md:p-10">
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                        <div>
                            <h1 className="text-4xl font-bold">
                                Campaign Forms
                            </h1>

                            <p className="mt-2 max-w-2xl text-zinc-400">
                                Create raffles, giveaways, RSVP forms,
                                presale lists, artist campaigns, and lead
                                capture forms.
                            </p>
                        </div>

                        <Link
                            href="/forms/new"
                            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                        >
                            Create Form
                        </Link>
                    </div>

                    {status && (
                        <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
                            {status}
                        </p>
                    )}

                    <section className="mt-8">
                        {loading ? (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-72 animate-pulse rounded-2xl bg-zinc-900"
                                    />
                                ))}
                            </div>
                        ) : forms.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-12 text-center">
                                <div className="text-4xl">📝</div>

                                <h2 className="mt-4 text-2xl font-bold">
                                    No campaign forms yet
                                </h2>

                                <p className="mx-auto mt-3 max-w-lg text-zinc-400">
                                    Create your first raffle, giveaway, RSVP,
                                    waitlist, or presale form.
                                </p>

                                <Link
                                    href="/forms/new"
                                    className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200"
                                >
                                    Create First Form
                                </Link>
                            </div>
                        ) : (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {forms.map((form) => {
                                    const submissionCount =
                                        submissionCounts[form.id] || 0;

                                    const connectedEvent =
                                        Array.isArray(form.events)
                                            ? form.events[0] ?? null
                                            : form.events;

                                    return (
                                        <article
                                            key={form.id}
                                            className="flex flex-col rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold capitalize text-blue-300">
                                                        {form.form_type}
                                                    </span>

                                                    <h2 className="mt-4 text-xl font-bold">
                                                        {form.name}
                                                    </h2>

                                                    <p className="mt-1 text-sm text-zinc-500">
                                                        /f/{form.slug}
                                                    </p>

                                                    {connectedEvent ? (
                                                        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                                                                Connected Event
                                                            </p>

                                                            <p className="mt-1 text-sm font-semibold text-white">
                                                                {connectedEvent.name}
                                                            </p>

                                                            <p className="mt-1 text-xs text-emerald-100/70">
                                                                {connectedEvent.venue || "Venue not set"}
                                                                {" · "}
                                                                {new Date(
                                                                    `${connectedEvent.event_date}T12:00:00`
                                                                ).toLocaleDateString(
                                                                    "en-CA",
                                                                    {
                                                                        year: "numeric",
                                                                        month: "short",
                                                                        day: "numeric",
                                                                    }
                                                                )}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                                                            <p className="text-xs font-semibold text-amber-300">
                                                                No event connected
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${form.is_active
                                                        ? "bg-green-500/10 text-green-300"
                                                        : "bg-zinc-800 text-zinc-400"
                                                        }`}
                                                >
                                                    {form.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </div>

                                            <p className="mt-5 line-clamp-3 min-h-16 text-sm leading-6 text-zinc-400">
                                                {form.description ||
                                                    "No description added."}
                                            </p>

                                            <div className="mt-6 grid grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-black p-4">
                                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                                        Submissions
                                                    </p>

                                                    <p className="mt-2 text-2xl font-bold">
                                                        {submissionCount}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-black p-4">
                                                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                                                        Created
                                                    </p>

                                                    <p className="mt-2 text-sm font-semibold">
                                                        {new Date(
                                                            form.created_at
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-6 grid gap-2 sm:grid-cols-2">
                                                <Link
                                                    href={`/f/${form.slug}`}
                                                    target="_blank"
                                                    className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
                                                >
                                                    Preview
                                                </Link>

                                                <Link
                                                    href={`/forms/${form.id}/edit`}
                                                    className="rounded-lg bg-zinc-800 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-zinc-700"
                                                >
                                                    Edit
                                                </Link>

                                                <Link
                                                    href={`/forms/${form.id}/submissions`}
                                                    className="rounded-lg bg-zinc-800 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-zinc-700"
                                                >
                                                    Submissions
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void toggleFormStatus(
                                                            form.id,
                                                            form.is_active
                                                        )
                                                    }
                                                    className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-semibold transition hover:bg-zinc-700"
                                                >
                                                    {form.is_active
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </button>
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void copyPublicLink(form.slug)
                                                    }
                                                    className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
                                                >

                                                    Copy Link
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void copyEmbedCode(form.slug)
                                                    }
                                                    className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
                                                >
                                                    Copy Embed
                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={() => void duplicateForm(form.id)}
                                                    className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 sm:col-span-2"
                                                >
                                                    Duplicate Form
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </AdminGuard>
    );
}