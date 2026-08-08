import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

function cleanText(value: FormDataEntryValue | null, max = 2000) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

async function createEvent(formData: FormData) {
    "use server";

    await requireAdmin("/events/new");

    const cookieStore = await cookies();

    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        redirect(
            "/events/new?error=Missing%20Supabase%20configuration"
        );
    }

    const supabase = createServerClient(
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
                        // Server actions can normally write cookies.
                    }
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/events/new");
    }

    const name =
        cleanText(formData.get("name"), 150) ||
        "Ora Night";

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

    if (
        !venue ||
        !address ||
        !eventDate ||
        !clubTime
    ) {
        redirect(
            "/events/new?error=Venue%2C%20address%2C%20date%2C%20and%20celebration%20time%20are%20required"
        );
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
    ) {
        redirect(
            "/events/new?error=Invalid%20event%20date"
        );
    }

    const {
        data: event,
        error,
    } = await supabase
        .from("events")
        .insert({
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
            is_active: true,
        })
        .select("id")
        .single();

    if (error || !event) {
        console.error(
            "Create event error:",
            error
        );

        redirect(
            `/events/new?error=${encodeURIComponent(
                error?.message ||
                "The event could not be created"
            )}`
        );
    }

    redirect(`/events/${event.id}`);
}

type NewEventPageProps = {
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function NewEventPage({
    searchParams,
}: NewEventPageProps) {
    await requireAdmin("/events/new");

    const params = await searchParams;
    const errorMessage = params.error
        ? decodeURIComponent(params.error)
        : "";

    return (
        <main className="min-h-screen bg-black px-6 py-8 text-white md:px-10">
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                            Ora CRM
                        </p>

                        <h1 className="mt-2 text-4xl font-bold">
                            Create Event
                        </h1>

                        <p className="mt-2 text-zinc-400">
                            Create one event for each Ora Night date.
                        </p>
                    </div>

                    <Link
                        href="/events"
                        className="rounded-xl border border-zinc-700 px-4 py-2 font-semibold transition hover:bg-zinc-900"
                    >
                        Back to Events
                    </Link>
                </div>

                {errorMessage ? (
                    <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-red-200">
                        {errorMessage}
                    </div>
                ) : null}

                <form
                    action={createEvent}
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
                                defaultValue="Ora Night"
                                required
                            />

                            <Field
                                label="Event date"
                                name="event_date"
                                type="date"
                                required
                            />

                            <Field
                                label="Venue"
                                name="venue"
                                defaultValue="ZAMA"
                                required
                            />

                            <Field
                                label="Address"
                                name="address"
                                defaultValue="3709 Boulevard Saint-Laurent, Montréal"
                                required
                            />

                            <Field
                                label="Lounge dinner starts"
                                name="dinner_time"
                                type="time"
                                defaultValue="20:00"
                            />

                            <Field
                                label="Celebration starts"
                                name="club_time"
                                type="time"
                                defaultValue="23:00"
                                required
                            />

                            <Field
                                label="Dress code"
                                name="dress_code"
                                defaultValue="Dress code required"
                            />

                            <Field
                                label="Music"
                                name="music"
                                defaultValue="Afro House • Urban • Amapiano"
                            />

                            <Field
                                label="Host"
                                name="host_name"
                                defaultValue="@wknd.presents"
                            />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="text-xl font-semibold">
                            SMS notifications
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                            The first message is sent when someone joins.
                            The reminder is scheduled for the event day at
                            12:00 PM.
                        </p>

                        <div className="mt-5 space-y-5">
                            <TextArea
                                label="Immediate invitation"
                                name="invitation_message"
                                defaultValue={`You’re on the Ora Night guest list 🎉

📅 Friday, July 24
📍 ZAMA
3709 Saint-Laurent, Montréal
🍽️ Lounge dinner: 8–11 PM
🌙 Celebration from 11 PM
🎶 Afro House • Urban • Amapiano
👔 Dress code required

Hosted by @wknd.presents`}
                            />

                            <TextArea
                                label="Event-day reminder"
                                name="reminder_message"
                                defaultValue={`Ora Night is tonight 🔥

📍 ZAMA
3709 Saint-Laurent, Montréal
🍽️ Lounge dinner: 8–11 PM
🌙 Celebration from 11 PM
👔 Dress code required

Hosted by @wknd.presents`}
                            />
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
                        >
                            Create Event
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
