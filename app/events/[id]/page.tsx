import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type EventPageProps = {
    params: Promise<{
        id: string;
    }>;
};

type EventRow = {
    id: number;
    name: string;
    venue: string;
    address: string;
    event_date: string;
    dinner_time: string | null;
    club_time: string;
    dress_code: string | null;
    music: string | null;
    host_name: string | null;
    is_active: boolean;
};

type GuestListEntryRow = {
    id: number;
    guest_id: number | null;
    phone: string;
    status: string;
    invitation_status: string;
    reminder_status: string;
    created_at: string;
    guests:
    | {
        name: string | null;
        instagram: string | null;
    }
    | {
        name: string | null;
        instagram: string | null;
    }[]
    | null;
};

function formatDate(dateValue: string) {
    const date = new Date(`${dateValue}T12:00:00`);

    return new Intl.DateTimeFormat("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function formatTime(timeValue: string | null) {
    if (!timeValue) {
        return "—";
    }

    const [hourText, minuteText] = timeValue.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    const date = new Date();
    date.setHours(hour, minute, 0, 0);

    return new Intl.DateTimeFormat("en-CA", {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function maskPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");

    if (digits.length < 4) {
        return phone;
    }

    return `••• ••• ${digits.slice(-4)}`;
}

function getGuest(entry: GuestListEntryRow) {
    if (!entry.guests) {
        return null;
    }

    return Array.isArray(entry.guests)
        ? entry.guests[0] || null
        : entry.guests;
}

export default async function EventPage({
    params,
}: EventPageProps) {
    const { id } = await params;
    const eventId = Number(id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
        notFound();
    }

    const cookieStore = await cookies();

    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase public environment variables."
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
                        // Server components may not always write cookies.
                    }
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=/events/${eventId}`);
    }

    const [
        { data: eventData, error: eventError },
        { data: entriesData, error: entriesError },
    ] = await Promise.all([
        supabase
            .from("events")
            .select(
                `
          id,
          name,
          venue,
          address,
          event_date,
          dinner_time,
          club_time,
          dress_code,
          music,
          host_name,
          is_active
        `
            )
            .eq("id", eventId)
            .maybeSingle(),

        supabase
            .from("guest_list_entries")
            .select(
                `
          id,
          guest_id,
          phone,
          status,
          invitation_status,
          reminder_status,
          created_at,
          guests (
            name,
            instagram
          )
        `
            )
            .eq("event_id", eventId)
            .order("created_at", {
                ascending: false,
            }),
    ]);

    if (eventError) {
        console.error("Event detail error:", eventError);
    }

    if (entriesError) {
        console.error(
            "Guest-list detail error:",
            entriesError
        );
    }

    if (!eventData) {
        notFound();
    }

    const event = eventData as EventRow;
    const entries =
        (entriesData || []) as GuestListEntryRow[];

    const totalGuests = entries.filter(
        (entry) => entry.status !== "cancelled"
    ).length;

    const checkedIn = entries.filter(
        (entry) => entry.status === "checked_in"
    ).length;

    const invitesSent = entries.filter(
        (entry) =>
            entry.invitation_status === "sent"
    ).length;

    const remindersSent = entries.filter(
        (entry) =>
            entry.reminder_status === "sent"
    ).length;

    return (
        <main className="min-h-screen bg-black px-6 py-8 text-white md:px-10">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                            Ora CRM
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="text-4xl font-bold">
                                {event.name}
                            </h1>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${event.is_active
                                        ? "bg-emerald-950 text-emerald-300"
                                        : "bg-zinc-800 text-zinc-400"
                                    }`}
                            >
                                {event.is_active
                                    ? "Active"
                                    : "Inactive"}
                            </span>
                        </div>

                        <p className="mt-3 text-xl text-zinc-200">
                            {formatDate(event.event_date)}
                        </p>

                        <p className="mt-2 text-zinc-400">
                            {event.venue} · {event.address}
                        </p>

                        <p className="mt-1 text-zinc-400">
                            Lounge dinner:{" "}
                            {formatTime(event.dinner_time)} ·
                            Celebration:{" "}
                            {formatTime(event.club_time)}
                        </p>

                        {event.music ? (
                            <p className="mt-1 text-zinc-400">
                                {event.music}
                            </p>
                        ) : null}

                        {event.dress_code ? (
                            <p className="mt-1 text-zinc-400">
                                {event.dress_code}
                            </p>
                        ) : null}

                        {event.host_name ? (
                            <p className="mt-1 text-zinc-400">
                                Hosted by {event.host_name}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/events"
                            className="rounded-xl border border-zinc-700 px-4 py-2 font-semibold transition hover:bg-zinc-900"
                        >
                            Back to Events
                        </Link>

                        <Link
                            href={`/events/${event.id}/edit`}
                            className="rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:bg-zinc-200"
                        >
                            Edit Event
                        </Link>
                    </div>
                </div>

                <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Guest List"
                        value={totalGuests}
                    />

                    <StatCard
                        label="Checked In"
                        value={checkedIn}
                    />

                    <StatCard
                        label="Invites Sent"
                        value={invitesSent}
                    />

                    <StatCard
                        label="Reminders Sent"
                        value={remindersSent}
                    />
                </section>

                <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-5">
                        <div>
                            <h2 className="text-2xl font-semibold">
                                Guest List
                            </h2>

                            <p className="mt-1 text-sm text-zinc-400">
                                One registration per phone number for this event.
                            </p>
                        </div>
                    </div>

                    {entriesError ? (
                        <div className="p-6 text-red-300">
                            The guest list could not be loaded.
                        </div>
                    ) : null}

                    {!entriesError && entries.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-lg font-medium">
                                No registrations yet
                            </p>

                            <p className="mt-2 text-zinc-400">
                                Guests will appear here after joining the
                                public event form.
                            </p>
                        </div>
                    ) : null}

                    {entries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-800">
                                <thead className="bg-black">
                                    <tr>
                                        <TableHeading>Name</TableHeading>
                                        <TableHeading>Phone</TableHeading>
                                        <TableHeading>Instagram</TableHeading>
                                        <TableHeading>Invitation</TableHeading>
                                        <TableHeading>Reminder</TableHeading>
                                        <TableHeading>Status</TableHeading>
                                        <TableHeading>Registered</TableHeading>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-zinc-800">
                                    {entries.map((entry) => {
                                        const guest = getGuest(entry);

                                        return (
                                            <tr
                                                key={entry.id}
                                                className="hover:bg-zinc-900/60"
                                            >
                                                <TableCell>
                                                    {guest?.name || "Unknown guest"}
                                                </TableCell>

                                                <TableCell>
                                                    {maskPhone(entry.phone)}
                                                </TableCell>

                                                <TableCell>
                                                    {guest?.instagram
                                                        ? guest.instagram.startsWith("@")
                                                            ? guest.instagram
                                                            : `@${guest.instagram}`
                                                        : "—"}
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge
                                                        value={
                                                            entry.invitation_status
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge
                                                        value={
                                                            entry.reminder_status
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge
                                                        value={entry.status}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    {new Intl.DateTimeFormat(
                                                        "en-CA",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        }
                                                    ).format(
                                                        new Date(entry.created_at)
                                                    )}
                                                </TableCell>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}

function StatCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-3xl font-bold">{value}</p>
            <p className="mt-2 text-sm uppercase tracking-wide text-zinc-500">
                {label}
            </p>
        </div>
    );
}

function TableHeading({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {children}
        </th>
    );
}

function TableCell({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-200">
            {children}
        </td>
    );
}

function StatusBadge({
    value,
}: {
    value: string;
}) {
    const normalized = value.toLowerCase();

    let classes =
        "bg-zinc-800 text-zinc-300";

    if (
        normalized === "sent" ||
        normalized === "confirmed" ||
        normalized === "checked_in"
    ) {
        classes =
            "bg-emerald-950 text-emerald-300";
    } else if (
        normalized === "failed" ||
        normalized === "cancelled" ||
        normalized === "no_show"
    ) {
        classes =
            "bg-red-950 text-red-300";
    } else if (
        normalized === "pending" ||
        normalized === "processing"
    ) {
        classes =
            "bg-amber-950 text-amber-300";
    }

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${classes}`}
        >
            {value.replaceAll("_", " ")}
        </span>
    );
}
