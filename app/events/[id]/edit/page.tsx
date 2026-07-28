import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type EventRecord = {
    id: number;
    name: string;
    venue: string | null;
    address: string | null;
    event_date: string;
    dinner_time: string | null;
    club_time: string | null;
    timezone: string | null;
    dress_code: string | null;
    music: string | null;
    host_name: string | null;
    invitation_message: string | null;
    reminder_message: string | null;
    is_active: boolean;
};

function cleanText(
    value: FormDataEntryValue | null,
    max = 2000
) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

async function getSupabase() {
    const cookieStore = await cookies();

    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase configuration."
        );
    }

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(cookiesToSet) {
                    try {
                        for (const {
                            name,
                            value,
                            options,
                        } of cookiesToSet) {
                            cookieStore.set(
                                name,
                                value,
                                options
                            );
                        }
                    } catch {
                        // Server components cannot always set cookies.
                    }
                },
            },
        }
    );
}

async function updateEvent(
    eventId: number,
    formData: FormData
) {
    "use server";

    const supabase = await getSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(
            `/login?next=/events/${eventId}/edit`
        );
    }

    const name =
        cleanText(formData.get("name"), 150);

    const venue =
        cleanText(formData.get("venue"), 150);

    const address =
        cleanText(formData.get("address"), 300);

    const eventDate =
        cleanText(formData.get("event_date"), 10);

    const dinnerTime =
        cleanText(formData.get("dinner_time"), 8);

    const clubTime =
        cleanText(formData.get("club_time"), 8);

    const dressCode =
        cleanText(formData.get("dress_code"), 300);

    const music =
        cleanText(formData.get("music"), 300);

    const hostName =
        cleanText(formData.get("host_name"), 150);

    const invitationMessage =
        cleanText(
            formData.get("invitation_message"),
            2000
        );

    const reminderMessage =
        cleanText(
            formData.get("reminder_message"),
            2000
        );

    const isActive =
        formData.get("is_active") === "on";

    if (
        !name ||
        !venue ||
        !address ||
        !eventDate ||
        !clubTime
    ) {
        redirect(
            `/events/${eventId}/edit?error=${encodeURIComponent(
                "Name, venue, address, date, and celebration time are required."
            )}`
        );
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
    ) {
        redirect(
            `/events/${eventId}/edit?error=${encodeURIComponent(
                "Invalid event date."
            )}`
        );
    }

    if (isActive) {
        const { error: deactivateError } =
            await supabase
                .from("events")
                .update({
                    is_active: false,
                })
                .neq("id", eventId);

        if (deactivateError) {
            redirect(
                `/events/${eventId}/edit?error=${encodeURIComponent(
                    deactivateError.message
                )}`
            );
        }
    }

    const { error } = await supabase
        .from("events")
        .update({
            name,
            venue,
            address,
            event_date: eventDate,
            dinner_time: dinnerTime || null,
            club_time: clubTime,
            timezone: "America/Toronto",
            dress_code: dressCode || null,
            music: music || null,
            host_name: hostName || null,
            invitation_message:
                invitationMessage || null,
            reminder_message:
                reminderMessage || null,
            is_active: isActive,
        })
        .eq("id", eventId);

    if (error) {
        redirect(
            `/events/${eventId}/edit?error=${encodeURIComponent(
                error.message
            )}`
        );
    }

    redirect(
        `/events?success=${encodeURIComponent(
            "Event updated successfully."
        )}`
    );
}

type EditEventPageProps = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function EditEventPage({
    params,
    searchParams,
}: EditEventPageProps) {
    const { id } = await params;
    const query = await searchParams;

    const eventId = Number(id);

    if (
        !Number.isInteger(eventId) ||
        eventId <= 0
    ) {
        notFound();
    }

    const supabase = await getSupabase();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(
            `/login?next=/events/${eventId}/edit`
        );
    }

    const { data, error } = await supabase
        .from("events")
        .select(`
            id,
            name,
            venue,
            address,
            event_date,
            dinner_time,
            club_time,
            timezone,
            dress_code,
            music,
            host_name,
            invitation_message,
            reminder_message,
            is_active
        `)
        .eq("id", eventId)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Unable to load event: ${error.message}`
        );
    }

    if (!data) {
        notFound();
    }

    const event = data as EventRecord;

    const action = updateEvent.bind(
        null,
        eventId
    );

    return (
        <main className="min-h-screen bg-black px-6 py-8 text-white md:px-10">
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                            Ora CRM
                        </p>

                        <h1 className="mt-2 text-4xl font-bold">
                            Edit Event
                        </h1>

                        <p className="mt-2 text-zinc-400">
                            Update the event name, venue, date, times, and messages.
                        </p>
                    </div>

                    <Link
                        href="/events"
                        className="rounded-xl border border-zinc-700 px-4 py-2 font-semibold transition hover:bg-zinc-900"
                    >
                        Back to Events
                    </Link>
                </div>

                {query.error ? (
                    <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-red-200">
                        {decodeURIComponent(
                            query.error
                        )}
                    </div>
                ) : null}

                <form
                    action={action}
                    className="mt-8 space-y-8"
                >
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="text-xl font-semibold">
                            Event details
                        </h2>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <Field
                                label="Event name"
                                name="name"
                                defaultValue={event.name}
                                required
                            />

                            <Field
                                label="Event date"
                                name="event_date"
                                type="date"
                                defaultValue={event.event_date}
                                required
                            />

                            <Field
                                label="Venue"
                                name="venue"
                                defaultValue={event.venue || ""}
                                required
                            />

                            <Field
                                label="Address"
                                name="address"
                                defaultValue={event.address || ""}
                                required
                            />

                            <Field
                                label="Lounge dinner starts"
                                name="dinner_time"
                                type="time"
                                defaultValue={
                                    event.dinner_time || ""
                                }
                            />

                            <Field
                                label="Celebration starts"
                                name="club_time"
                                type="time"
                                defaultValue={
                                    event.club_time || ""
                                }
                                required
                            />

                            <Field
                                label="Dress code"
                                name="dress_code"
                                defaultValue={
                                    event.dress_code || ""
                                }
                            />

                            <Field
                                label="Music"
                                name="music"
                                defaultValue={
                                    event.music || ""
                                }
                            />

                            <Field
                                label="Host"
                                name="host_name"
                                defaultValue={
                                    event.host_name || ""
                                }
                            />
                        </div>

                        <label className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-800 bg-black p-4">
                            <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={
                                    event.is_active
                                }
                                className="h-5 w-5"
                            />

                            <span>
                                <span className="block font-semibold">
                                    Active event
                                </span>

                                <span className="mt-1 block text-sm text-zinc-500">
                                    The active event is used by the dashboard and default check-in workflow.
                                </span>
                            </span>
                        </label>
                    </section>

                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="text-xl font-semibold">
                            SMS notifications
                        </h2>

                        <div className="mt-5 space-y-5">
                            <TextArea
                                label="Immediate invitation"
                                name="invitation_message"
                                defaultValue={
                                    event.invitation_message || ""
                                }
                            />

                            <TextArea
                                label="Event-day reminder"
                                name="reminder_message"
                                defaultValue={
                                    event.reminder_message || ""
                                }
                            />
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
                        >
                            Save Changes
                        </button>

                        <Link
                            href="/events"
                            className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold transition hover:bg-zinc-900"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    );
}

function Field({
    label,
    name,
    type = "text",
    defaultValue,
    required = false,
}: {
    label: string;
    name: string;
    type?: string;
    defaultValue?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">
                {label}
            </span>

            <input
                name={name}
                type={type}
                defaultValue={defaultValue}
                required={required}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-zinc-400"
            />
        </label>
    );
}

function TextArea({
    label,
    name,
    defaultValue,
}: {
    label: string;
    name: string;
    defaultValue: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">
                {label}
            </span>

            <textarea
                name={name}
                defaultValue={defaultValue}
                rows={9}
                className="w-full resize-y rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-zinc-400"
            />
        </label>
    );
}
