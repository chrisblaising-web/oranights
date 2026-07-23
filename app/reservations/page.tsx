"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Guest = {
    id: number;
    name: string | null;
    phone: string | null;
    vip_level: string | null;
};

type Reservation = {
    id: number;
    guest_id: number;
    reservation_date: string;
    reservation_time: string | null;
    party_size: number;
    table_number: string | null;
    reservation_type: string;
    status: string;
    notes: string | null;
    created_at: string;
    guests?: Guest | null;
};

type ReservationForm = {
    guest_id: string;
    reservation_date: string;
    reservation_time: string;
    party_size: string;
    table_number: string;
    reservation_type: string;
    status: string;
    notes: string;
};

const initialForm: ReservationForm = {
    guest_id: "",
    reservation_date: "",
    reservation_time: "",
    party_size: "1",
    table_number: "",
    reservation_type: "Dinner",
    status: "Pending",
    notes: "",
};

export default function ReservationsPage() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [form, setForm] = useState<ReservationForm>(initialForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadPage();
    }, []);

    async function loadPage() {
        setLoading(true);
        setMessage("");

        const guestsResponse = await supabase
            .from("guests")
            .select("id, name, phone, vip_level")
            .order("name", { ascending: true });

        if (guestsResponse.error) {
            console.error("Guest loading error:", guestsResponse.error);
            setMessage(
                `Could not load guests: ${guestsResponse.error.message}`
            );
        } else {
            setGuests(guestsResponse.data ?? []);
        }

        const reservationsResponse = await supabase
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
        created_at,
        guests (
          id,
          name,
          phone,
          vip_level
        )
      `)
            .order("reservation_date", { ascending: true })
            .order("reservation_time", { ascending: true });

        if (reservationsResponse.error) {
            console.error(
                "Reservation loading error:",
                reservationsResponse.error
            );

            setMessage(
                `Could not load reservations: ${reservationsResponse.error.message}`
            );
        } else {
            const normalizedReservations = (reservationsResponse.data ?? []).map(
                (reservation) => ({
                    ...reservation,
                    guests: Array.isArray(reservation.guests)
                        ? reservation.guests[0] ?? null
                        : reservation.guests ?? null,
                })
            ) as Reservation[];

            setReservations(normalizedReservations);
        }

        setLoading(false);
    }

    function updateField(
        field: keyof ReservationForm,
        value: string
    ) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setMessage("");

        const guestId = Number(form.guest_id);
        const partySize = Number(form.party_size);

        if (!guestId) {
            setMessage("Please select a guest.");
            return;
        }

        if (!form.reservation_date) {
            setMessage("Please select a reservation date.");
            return;
        }

        if (!Number.isInteger(partySize) || partySize < 1) {
            setMessage("Party size must be at least 1.");
            return;
        }

        setSaving(true);

        const { error } = await supabase
            .from("reservations")
            .insert([
                {
                    guest_id: guestId,
                    reservation_date: form.reservation_date,
                    reservation_time:
                        form.reservation_time || null,
                    party_size: partySize,
                    table_number:
                        form.table_number.trim() || null,
                    reservation_type: form.reservation_type,
                    status: form.status,
                    notes: form.notes.trim() || null,
                },
            ]);

        if (error) {
            console.error("Create reservation error:", error);

            setMessage(
                `Could not create reservation: ${error.message}`
            );

            setSaving(false);
            return;
        }

        setForm(initialForm);
        setMessage("Reservation created successfully.");
        setSaving(false);

        await loadPage();
    }

    async function changeStatus(
        reservationId: number,
        newStatus: string
    ) {
        setMessage("");

        const { error } = await supabase
            .from("reservations")
            .update({
                status: newStatus,
            })
            .eq("id", reservationId);

        if (error) {
            console.error("Status update error:", error);

            setMessage(
                `Could not update reservation: ${error.message}`
            );

            return;
        }

        setMessage("Reservation status updated.");
        await loadPage();
    }

    async function deleteReservation(
        reservationId: number
    ) {
        const confirmed = window.confirm(
            "Delete this reservation? The guest will stay in your guest list."
        );

        if (!confirmed) {
            return;
        }

        setMessage("");

        const { error } = await supabase
            .from("reservations")
            .delete()
            .eq("id", reservationId);

        if (error) {
            console.error("Delete reservation error:", error);

            setMessage(
                `Could not delete reservation: ${error.message}`
            );

            return;
        }

        setMessage("Reservation deleted.");
        await loadPage();
    }

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 p-6 sm:p-10">
                <div className="mx-auto max-w-7xl">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                            Ora CRM
                        </p>

                        <h1 className="mt-2 text-4xl font-bold">
                            Reservations
                        </h1>

                        <p className="mt-3 text-zinc-400">
                            Assign guests to a date, time, party size and
                            table.
                        </p>
                    </div>

                    <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="text-2xl font-bold">
                            Add Reservation
                        </h2>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-8 grid gap-5 md:grid-cols-2"
                        >
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium">
                                    Guest
                                </label>

                                <select
                                    value={form.guest_id}
                                    onChange={(event) =>
                                        updateField(
                                            "guest_id",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                    required
                                >
                                    <option value="">
                                        Select a guest
                                    </option>

                                    {guests.map((guest) => (
                                        <option
                                            key={guest.id}
                                            value={guest.id}
                                        >
                                            {guest.name || "Unnamed Guest"}
                                            {guest.phone
                                                ? ` — ${guest.phone}`
                                                : ""}
                                            {guest.vip_level
                                                ? ` — ${guest.vip_level}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Reservation Date
                                </label>

                                <input
                                    type="date"
                                    value={form.reservation_date}
                                    onChange={(event) =>
                                        updateField(
                                            "reservation_date",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Reservation Time
                                </label>

                                <input
                                    type="time"
                                    value={form.reservation_time}
                                    onChange={(event) =>
                                        updateField(
                                            "reservation_time",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Number of People
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    value={form.party_size}
                                    onChange={(event) =>
                                        updateField(
                                            "party_size",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                    placeholder="Example: 6"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Table Number
                                </label>

                                <input
                                    type="text"
                                    value={form.table_number}
                                    onChange={(event) =>
                                        updateField(
                                            "table_number",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                    placeholder="Example: T12 or VIP 3"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Reservation Type
                                </label>

                                <select
                                    value={form.reservation_type}
                                    onChange={(event) =>
                                        updateField(
                                            "reservation_type",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                >
                                    <option value="Dinner">
                                        Dinner
                                    </option>

                                    <option value="Club">
                                        Club
                                    </option>

                                    <option value="Dinner + Club">
                                        Dinner + Club
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Status
                                </label>

                                <select
                                    value={form.status}
                                    onChange={(event) =>
                                        updateField(
                                            "status",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                >
                                    <option value="Pending">
                                        Pending
                                    </option>

                                    <option value="Confirmed">
                                        Confirmed
                                    </option>

                                    <option value="Seated">
                                        Seated
                                    </option>

                                    <option value="Completed">
                                        Completed
                                    </option>

                                    <option value="Cancelled">
                                        Cancelled
                                    </option>

                                    <option value="No Show">
                                        No Show
                                    </option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium">
                                    Notes
                                </label>

                                <textarea
                                    value={form.notes}
                                    onChange={(event) =>
                                        updateField(
                                            "notes",
                                            event.target.value
                                        )
                                    }
                                    rows={4}
                                    className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 p-4"
                                    placeholder="Birthday, bottle request, seating preference..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full rounded-lg bg-white px-6 py-4 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving Reservation..."
                                        : "Save Reservation"}
                                </button>
                            </div>
                        </form>
                    </section>

                    {message && (
                        <div className="mt-6 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
                            {message}
                        </div>
                    )}

                    <section className="mt-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Reservation List
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    {reservations.length} reservation
                                    {reservations.length === 1 ? "" : "s"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={loadPage}
                                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
                            >
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-zinc-400">
                                Loading reservations...
                            </div>
                        ) : reservations.length === 0 ? (
                            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
                                No reservations yet.
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {reservations.map((reservation) => (
                                    <article
                                        key={reservation.id}
                                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                                    >
                                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h3 className="text-xl font-bold">
                                                        {reservation.guests?.name ||
                                                            "Unknown Guest"}
                                                    </h3>

                                                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">
                                                        {reservation.status}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                                                    <p>
                                                        Date:{" "}
                                                        <span className="text-white">
                                                            {
                                                                reservation.reservation_date
                                                            }
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Time:{" "}
                                                        <span className="text-white">
                                                            {reservation.reservation_time
                                                                ? reservation.reservation_time.slice(
                                                                    0,
                                                                    5
                                                                )
                                                                : "Not set"}
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Party:{" "}
                                                        <span className="text-white">
                                                            {reservation.party_size} people
                                                        </span>
                                                    </p>

                                                    <p>
                                                        Table:{" "}
                                                        <span className="text-white">
                                                            {reservation.table_number ||
                                                                "Not assigned"}
                                                        </span>
                                                    </p>
                                                </div>

                                                <p className="mt-3 text-sm text-zinc-400">
                                                    Type:{" "}
                                                    <span className="text-white">
                                                        {
                                                            reservation.reservation_type
                                                        }
                                                    </span>
                                                </p>

                                                {reservation.notes && (
                                                    <p className="mt-3 text-sm text-zinc-500">
                                                        Notes: {reservation.notes}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <select
                                                    value={reservation.status}
                                                    onChange={(event) =>
                                                        changeStatus(
                                                            reservation.id,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3"
                                                >
                                                    <option value="Pending">
                                                        Pending
                                                    </option>

                                                    <option value="Confirmed">
                                                        Confirmed
                                                    </option>

                                                    <option value="Seated">
                                                        Seated
                                                    </option>

                                                    <option value="Completed">
                                                        Completed
                                                    </option>

                                                    <option value="Cancelled">
                                                        Cancelled
                                                    </option>

                                                    <option value="No Show">
                                                        No Show
                                                    </option>
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteReservation(
                                                            reservation.id
                                                        )
                                                    }
                                                    className="rounded-lg bg-red-950 px-4 py-3 text-red-300 hover:bg-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}