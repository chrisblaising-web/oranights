import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
<<<<<<< HEAD
import { notFound } from "next/navigation";

type GuestProfileProps = {
    params: Promise<{
        id: string;
    }>;
};

type SmsLog = {
    id: number;
    guest_id: number;
    campaign_id: number | null;
    campaign: string | null;
    audience: string | null;
    message: string | null;
    status: string | null;
    error_message: string | null;
    created_at: string;
};

type Reservation = {
    id: number;
    guest_id: number;
    reservation_date: string;
    reservation_time: string | null;
    party_size: number;
    table_number: string | null;
    reservation_type: string | null;
    status: string | null;
    notes: string | null;
    created_at: string;
};

function formatInstagram(username: string | null) {
    if (!username) {
        return "-";
    }

    return username.startsWith("@")
        ? username
        : `@${username}`;
}

function formatDateTime(date: string | null) {
    if (!date) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(date));
}

function formatReservationDate(date: string | null) {
    if (!date) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(`${date}T12:00:00`));
}

function formatReservationTime(time: string | null) {
    if (!time) {
        return "Time not set";
    }

    return time.slice(0, 5);
}

function getStatusClasses(status: string | null) {
    switch (status) {
        case "Confirmed":
            return "bg-green-950 text-green-400";
        case "Pending":
            return "bg-yellow-950 text-yellow-300";
        case "Seated":
            return "bg-blue-950 text-blue-300";
        case "Completed":
            return "bg-zinc-800 text-zinc-300";
        case "Cancelled":
            return "bg-red-950 text-red-400";
        default:
            return "bg-zinc-800 text-zinc-300";
    }
}

export default async function GuestProfile({
    params,
}: GuestProfileProps) {
    const { id } = await params;

    const guestId = Number(id);

    if (!Number.isInteger(guestId) || guestId <= 0) {
        notFound();
    }

    const [
        { data: guest, error: guestError },
        { data: smsLogs, error: smsError },
        { data: reservations, error: reservationError },
    ] = await Promise.all([
        supabase
            .from("guests")
            .select("*")
            .eq("id", guestId)
            .single(),

        supabase
            .from("sms_logs")
            .select(
                "id, guest_id, campaign_id, campaign, audience, message, status, error_message, created_at"
            )
            .eq("guest_id", guestId)
            .order("created_at", {
                ascending: false,
            }),

        supabase
            .from("reservations")
            .select(`
                id,
                guest_id,
                reservation_date,
                reservation_time,
                party_size,
                table_number,
                reservation_type,
                status,
                notes,
                created_at
            `)
            .eq("guest_id", guestId)
            .order("reservation_date", {
                ascending: false,
            })
            .order("reservation_time", {
                ascending: false,
            }),
    ]);

    if (guestError || !guest) {
        return (
            <div className="flex min-h-screen bg-black text-white">
                <Sidebar />

                <main className="flex-1 p-6 md:p-10">
                    <h1 className="text-4xl font-bold">
                        Guest Not Found
                    </h1>

                    <p className="mt-3 text-zinc-400">
                        This guest does not exist or you do not have
                        permission to view it.
                    </p>

                    <Link
                        href="/guests"
                        className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-medium text-black"
=======

export default async function GuestProfile({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { data: guest, error } = await supabase
        .from("guests")
        .select("*")
        .eq("id", Number(id))
        .single();
    const { data: smsLogs } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("guest_id", Number(id))
        .order("created_at", { ascending: false });

    if (error || !guest) {
        return (
            <div className="flex">
                <Sidebar />

                <main className="flex-1 min-h-screen bg-black text-white p-10">
                    <h1 className="text-4xl font-bold">Guest Not Found</h1>

                    <Link
                        href="/guests"
                        className="inline-block mt-6 bg-white text-black px-5 py-3 rounded-lg"
>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152
                    >
                        ← Back to Guests
                    </Link>
                </main>
            </div>
        );
    }

<<<<<<< HEAD
    const logs = (smsLogs ?? []) as SmsLog[];
    const reservationList =
        (reservations ?? []) as Reservation[];

    const today = new Date().toISOString().slice(0, 10);

    const activeReservations = reservationList.filter(
        (reservation) =>
            reservation.status !== "Cancelled"
    );

    const completedReservations = reservationList.filter(
        (reservation) =>
            reservation.status === "Completed"
    );

    const upcomingReservations = reservationList.filter(
        (reservation) =>
            reservation.reservation_date >= today &&
            reservation.status !== "Cancelled" &&
            reservation.status !== "Completed"
    );

    const lastReservation =
        activeReservations.length > 0
            ? activeReservations[0]
            : null;

    const totalPeopleBooked = activeReservations.reduce(
        (total, reservation) =>
            total + Number(reservation.party_size || 0),
        0
    );

    const smsLink = `/sms?guestId=${guest.id}&phone=${encodeURIComponent(
        guest.phone ?? ""
    )}&name=${encodeURIComponent(guest.name ?? "")}`;

    const reservationLink =
        `/reservations?guestId=${guest.id}`;

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 p-6 md:p-10">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <h1 className="text-4xl font-bold md:text-5xl">
                                {guest.name || "Unnamed Guest"}
                            </h1>

                            <p className="mt-2 text-zinc-400">
                                Guest ID #{guest.id}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/guests"
                                className="rounded-lg bg-zinc-800 px-5 py-3 transition hover:bg-zinc-700"
                            >
                                Back
                            </Link>

                            <Link
                                href={`/guests/${guest.id}/edit`}
                                className="rounded-lg bg-blue-600 px-5 py-3 transition hover:bg-blue-500"
                            >
                                Edit Guest
                            </Link>
                        </div>
                    </div>

                    <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <ProfileStat
                            label="Total Reservations"
                            value={reservationList.length}
                        />

                        <ProfileStat
                            label="Upcoming Reservations"
                            value={upcomingReservations.length}
                        />

                        <ProfileStat
                            label="Completed Visits"
                            value={completedReservations.length}
                        />

                        <ProfileStat
                            label="People Booked"
                            value={totalPeopleBooked}
                        />
                    </section>

                    <section className="mt-8 rounded-xl bg-zinc-900 p-6 md:p-8">
                        <h2 className="mb-6 text-2xl font-bold">
                            Personal Information
                        </h2>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                            <InfoItem
                                label="Phone"
                                value={guest.phone || "-"}
                            />

                            <InfoItem
                                label="Email"
                                value={guest.email || "-"}
                                breakAll
                            />

                            <InfoItem
                                label="Instagram"
                                value={formatInstagram(
                                    guest.instagram
                                )}
                            />

                            <InfoItem
                                label="Birthday"
                                value={guest.birthday || "-"}
                            />

                            <InfoItem
                                label="Gender"
                                value={guest.gender || "-"}
                            />

                            <InfoItem
                                label="VIP Level"
                                value={
                                    guest.vip_level || "Regular"
                                }
                            />

                            <div>
                                <p className="text-zinc-400">
                                    Tag
                                </p>

                                <span className="mt-1 inline-block rounded-full bg-zinc-800 px-3 py-1 text-sm">
                                    {guest.tag || "Regular"}
                                </span>
                            </div>

                            <InfoItem
                                label="Last Reservation"
                                value={
                                    lastReservation
                                        ? `${formatReservationDate(
                                            lastReservation.reservation_date
                                        )} at ${formatReservationTime(
                                            lastReservation.reservation_time
                                        )}`
                                        : "No reservations yet"
                                }
                            />
                        </div>
                    </section>

                    <section className="mt-8 rounded-xl bg-zinc-900 p-6 md:p-8">
                        <h2 className="mb-4 text-2xl font-bold">
                            Notes
                        </h2>

                        <p className="whitespace-pre-wrap text-zinc-300">
                            {guest.notes || "No notes added."}
                        </p>
                    </section>

                    <section className="mt-8 rounded-xl bg-zinc-900 p-6 md:p-8">
                        <h2 className="mb-6 text-2xl font-bold">
                            Quick Actions
                        </h2>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                href={`/guests/${guest.id}/edit`}
                                className="rounded-lg bg-blue-600 px-5 py-3 transition hover:bg-blue-500"
                            >
                                Edit Guest
                            </Link>

                            <Link
                                href={smsLink}
                                className="rounded-lg bg-green-600 px-5 py-3 transition hover:bg-green-500"
                            >
                                Send SMS
                            </Link>

                            <Link
                                href={reservationLink}
                                className="rounded-lg bg-purple-600 px-5 py-3 transition hover:bg-purple-500"
                            >
                                Create Reservation
                            </Link>
                        </div>
                    </section>

                    <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
                        <section className="rounded-xl bg-zinc-900 p-6 md:p-8">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold">
                                    Reservation History
                                </h2>

                                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                                    {reservationList.length} total
                                </span>
                            </div>

                            {reservationError && (
                                <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
                                    Reservation history could not be loaded:{" "}
                                    {reservationError.message}
                                </div>
                            )}

                            {!reservationError &&
                                reservationList.length > 0 ? (
                                <div className="max-h-[520px] space-y-4 overflow-y-auto pr-2">
                                    {reservationList.map(
                                        (reservation) => (
                                            <article
                                                key={reservation.id}
                                                className="rounded-lg border border-zinc-800 bg-black p-4"
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <h3 className="font-bold">
                                                            {reservation.reservation_type ||
                                                                "Reservation"}
                                                        </h3>

                                                        <p className="mt-1 text-sm text-zinc-400">
                                                            {formatReservationDate(
                                                                reservation.reservation_date
                                                            )}{" "}
                                                            at{" "}
                                                            {formatReservationTime(
                                                                reservation.reservation_time
                                                            )}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                                            reservation.status
                                                        )}`}
                                                    >
                                                        {reservation.status ||
                                                            "Unknown"}
                                                    </span>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                                                    <span className="rounded-full border border-zinc-700 px-3 py-1">
                                                        {
                                                            reservation.party_size
                                                        }{" "}
                                                        people
                                                    </span>

                                                    <span className="rounded-full border border-zinc-700 px-3 py-1">
                                                        {reservation.table_number ||
                                                            "No table assigned"}
                                                    </span>
                                                </div>

                                                {reservation.notes && (
                                                    <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-400">
                                                        {
                                                            reservation.notes
                                                        }
                                                    </p>
                                                )}
                                            </article>
                                        )
                                    )}
                                </div>
                            ) : !reservationError ? (
                                <p className="text-zinc-500">
                                    No reservations yet.
                                </p>
                            ) : null}
                        </section>

                        <section className="rounded-xl bg-zinc-900 p-6 md:p-8">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-2xl font-bold">
                                    SMS History
                                </h2>

                                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                                    {logs.length} messages
                                </span>
                            </div>

                            {smsError && (
                                <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
                                    SMS history could not be loaded:{" "}
                                    {smsError.message}
                                </div>
                            )}

                            {!smsError && logs.length > 0 ? (
                                <div className="max-h-[520px] space-y-4 overflow-y-auto pr-2">
                                    {logs.map((sms) => (
                                        <article
                                            key={sms.id}
                                            className="border-b border-zinc-700 pb-4 last:border-none"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <h3 className="font-bold">
                                                    {sms.campaign ||
                                                        "Direct message"}
                                                </h3>

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-medium ${["queued", "accepted", "sending", "sent", "delivered"].includes(sms.status || "")
                                                            ? "bg-green-950 text-green-400"
                                                            : sms.status ===
                                                                "failed"
                                                                ? "bg-red-950 text-red-400"
                                                                : "bg-zinc-800 text-zinc-300"
                                                        }`}
                                                >
                                                    {sms.status ||
                                                        "unknown"}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-xs text-zinc-500">
                                                {sms.audience || "Single Guest"}
                                                {sms.campaign_id ? ` · Campaign #${sms.campaign_id}` : ""}
                                            </p>

                                            <p className="mt-3 whitespace-pre-wrap text-zinc-300">
                                                {sms.message ||
                                                    "No message content."}
                                            </p>

                                            {sms.error_message && (
                                                <p className="mt-2 text-sm text-red-400">
                                                    {sms.error_message}
                                                </p>
                                            )}

                                            <p className="mt-3 text-xs text-zinc-500">
                                                {formatDateTime(
                                                    sms.created_at
                                                )}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            ) : !smsError ? (
                                <p className="text-zinc-500">
                                    No SMS messages have been sent to
                                    this guest.
                                </p>
                            ) : null}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

type ProfileStatProps = {
    label: string;
    value: number | string;
};

function ProfileStat({
    label,
    value,
}: ProfileStatProps) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold">
                {value}
            </p>
        </div>
    );
}

type InfoItemProps = {
    label: string;
    value: string;
    breakAll?: boolean;
};

function InfoItem({
    label,
    value,
    breakAll = false,
}: InfoItemProps) {
    return (
        <div>
            <p className="text-zinc-400">
                {label}
            </p>

            <p
                className={`text-lg ${breakAll ? "break-all" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}
=======
    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 min-h-screen bg-black text-white p-10">

                {/* Header */}

                <div className="flex justify-between items-center">

                    <div>
                        <h1 className="text-5xl font-bold">
                            {guest.name}
                        </h1>

                        <p className="text-zinc-400 mt-2">
                            Guest ID #{guest.id}
                        </p>
                    </div>

                    <div className="flex gap-3">

                        <Link
                            href="/guests"
                            className="bg-zinc-800 px-5 py-3 rounded-lg"
                        >
                            Back
                        </Link>

                        <Link
                            href={`/guests/${guest.id}/edit`}
                            className="bg-blue-600 px-5 py-3 rounded-lg"
                        >
                            Edit Guest
                        </Link>

                    </div>

                </div>

                {/* Personal Information */}

                <div className="mt-10 bg-zinc-900 rounded-xl p-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Personal Information
                    </h2>

                    <div className="grid grid-cols-2 gap-6">

                        <div>
                            <p className="text-zinc-400">Phone</p>
                            <p className="text-lg">{guest.phone || "-"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Email</p>
                            <p className="text-lg">{guest.email || "-"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Instagram</p>
                            <p className="text-lg">
                                {guest.instagram ? `@${guest.instagram}` : "-"}
                            </p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Birthday</p>
                            <p className="text-lg">{guest.birthday || "-"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">VIP Level</p>
                            <p className="text-lg">{guest.vip_level || "Regular"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Tag</p>
                            <p className="text-lg">{guest.tag || "Regular"}</p>
                        </div>

                    </div>

                </div>

                {/* Notes */}

                <div className="mt-8 bg-zinc-900 rounded-xl p-8">

                    <h2 className="text-2xl font-bold mb-4">
                        Notes
                    </h2>

                    <p className="text-zinc-300 whitespace-pre-wrap">
                        {guest.notes || "No notes added."}
                    </p>

                </div>

                {/* Quick Actions */}

                <div className="mt-8 bg-zinc-900 rounded-xl p-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Quick Actions
                    </h2>

                    <div className="flex flex-wrap gap-4">

                        <Link
                            href={`/guests/${guest.id}/edit`}
                            className="bg-blue-600 px-5 py-3 rounded-lg"
                        >
                            Edit Guest
                        </Link>

                        <Link
                            href="/sms"
                            className="bg-green-600 px-5 py-3 rounded-lg"
                        >
                            Send SMS
                        </Link>

                        <button
                            className="bg-purple-600 px-5 py-3 rounded-lg"
                        >
                            Create Reservation
                        </button>

                    </div>

                </div>

                {/* CRM Sections */}

                <div className="grid grid-cols-2 gap-8 mt-8">

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            Reservation History
                        </h2>

                        <p className="text-zinc-500">
                            No reservations yet.
                        </p>

                    </div>

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            SMS History
                        </h2>


                        {smsLogs && smsLogs.length > 0 ? (

                            <div className="space-y-4">

                                {smsLogs.map((sms: any) => (

                                    <div
                                        key={sms.id}
                                        className="border-b border-zinc-700 pb-4"
                                    >

                                        <h3 className="font-bold">
                                            {sms.campaign}
                                        </h3>


                                        <p className="text-zinc-400 mt-2">
                                            {sms.message}
                                        </p>


                                        <p className="text-green-400 mt-2">
                                            Status: {sms.status}
                                        </p>


                                        <p className="text-xs text-zinc-500 mt-2">
                                            {new Date(sms.created_at).toLocaleDateString()}
                                        </p>

                                    </div>

                                ))}

                            </div>

                        ) : (

                            <p className="text-zinc-500">
                                No SMS campaigns yet.
                            </p>

                        )}

                    </div>

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            Spending
                        </h2>

                        <p className="text-zinc-500">
                            Coming soon...
                        </p>

                    </div>

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            Activity Timeline
                        </h2>

                        <p className="text-zinc-500">
                            Coming soon...
                        </p>

                    </div>

                </div>

            </main>
        </div>
    );
}
>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152
