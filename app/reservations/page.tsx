"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Guest = {
    id: number;
    name: string | null;
    phone: string | null;
};

type EventRecord = {
    id: number;
    name: string;
    venue: string | null;
    event_date: string;
    is_active: boolean;
};

type Reservation = {
    id: number;
    guest_id: number;
    event_id: number | null;
    reservation_date: string;
    reservation_time: string | null;
    party_size: number;
    table_number: string | null;
    reservation_type: string;
    status: string;
    notes: string | null;
    created_at: string;
    guests?: Guest | null;
    events?: EventRecord | null;
};

type FormState = {
    guest_id: string;
    event_id: string;
    reservation_date: string;
    reservation_time: string;
    party_size: string;
    table_number: string;
    reservation_type: string;
    status: string;
    notes: string;
};

const initialForm: FormState = {
    guest_id: "",
    event_id: "",
    reservation_date: "",
    reservation_time: "",
    party_size: "2",
    table_number: "",
    reservation_type: "Dinner",
    status: "Pending",
    notes: "",
};

const STATUS_OPTIONS = [
    "Pending",
    "Confirmed",
    "Seated",
    "Completed",
    "Cancelled",
    "No Show",
];

const TYPE_OPTIONS = ["Dinner", "Lounge", "VIP Table", "Guest List"];

function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time: string | null) {
    if (!time) return "No time";

    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return new Intl.DateTimeFormat("en-CA", {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [form, setForm] = useState<FormState>(initialForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    async function loadData() {
        setLoading(true);
        setMessage("");

        const [reservationResult, guestResult, eventResult] = await Promise.all([
            supabase
                .from("reservations")
                .select(`
          id,
          guest_id,
          event_id,
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
            phone
          ),
          events (
            id,
            name,
            venue,
            event_date,
            is_active
          )
        `)
                .order("reservation_date", { ascending: true })
                .order("reservation_time", { ascending: true }),

            supabase
                .from("guests")
                .select("id, name, phone")
                .order("name", { ascending: true }),

            supabase
                .from("events")
                .select("id, name, venue, event_date, is_active")
                .order("event_date", { ascending: false }),
        ]);

        if (
            reservationResult.error ||
            guestResult.error ||
            eventResult.error
        ) {
            setMessage(
                reservationResult.error?.message ||
                guestResult.error?.message ||
                eventResult.error?.message ||
                "Could not load reservations."
            );
            setLoading(false);
            return;
        }

        setReservations((reservationResult.data ?? []) as unknown as Reservation[]);
        setGuests((guestResult.data ?? []) as Guest[]);
        setEvents((eventResult.data ?? []) as EventRecord[]);
        setLoading(false);
    }

    useEffect(() => {
        void loadData();
    }, []);

    const filteredReservations = useMemo(() => {
        const query = search.trim().toLowerCase();

        return reservations.filter((reservation) => {
            const guestName = reservation.guests?.name?.toLowerCase() ?? "";
            const phone = reservation.guests?.phone?.toLowerCase() ?? "";
            const table = reservation.table_number?.toLowerCase() ?? "";

            const matchesSearch =
                !query ||
                guestName.includes(query) ||
                phone.includes(query) ||
                table.includes(query);

            const matchesStatus =
                statusFilter === "All" || reservation.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [reservations, search, statusFilter]);

    const totals = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        return {
            total: reservations.length,
            today: reservations.filter(
                (reservation) =>
                    reservation.reservation_date === today &&
                    reservation.status !== "Cancelled"
            ).length,
            confirmed: reservations.filter(
                (reservation) => reservation.status === "Confirmed"
            ).length,
            guests: reservations
                .filter((reservation) => reservation.status !== "Cancelled")
                .reduce(
                    (sum, reservation) => sum + Number(reservation.party_size || 0),
                    0
                ),
        };
    }, [reservations]);

    function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function resetForm() {
        setForm(initialForm);
        setEditingId(null);
        setMessage("");
    }

    function startEdit(reservation: Reservation) {
        setEditingId(reservation.id);
        setForm({
            guest_id: String(reservation.guest_id),
            event_id: reservation.event_id ? String(reservation.event_id) : "",
            reservation_date: reservation.reservation_date,
            reservation_time: reservation.reservation_time?.slice(0, 5) ?? "",
            party_size: String(reservation.party_size),
            table_number: reservation.table_number ?? "",
            reservation_type: reservation.reservation_type,
            status: reservation.status,
            notes: reservation.notes ?? "",
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");

        if (!form.guest_id) {
            setMessage("Select a guest.");
            return;
        }

        const selectedEvent = events.find(
            (item) => String(item.id) === form.event_id
        );
        const reservationDate = selectedEvent?.event_date || form.reservation_date;

        if (!reservationDate) {
            setMessage("Select an event or enter a reservation date.");
            return;
        }

        const partySize = Number(form.party_size);

        if (!Number.isInteger(partySize) || partySize < 1) {
            setMessage("Party size must be at least 1.");
            return;
        }

        setSaving(true);

        const payload = {
            guest_id: Number(form.guest_id),
            event_id: form.event_id ? Number(form.event_id) : null,
            reservation_date: reservationDate,
            reservation_time: form.reservation_time || null,
            party_size: partySize,
            table_number: form.table_number.trim() || null,
            reservation_type: form.reservation_type,
            status: form.status,
            notes: form.notes.trim() || null,
        };

        const result = editingId
            ? await supabase.from("reservations").update(payload).eq("id", editingId)
            : await supabase.from("reservations").insert(payload);

        if (result.error) {
            setMessage(result.error.message);
            setSaving(false);
            return;
        }

        setForm(initialForm);
        setEditingId(null);
        await loadData();
        setMessage(editingId ? "Reservation updated." : "Reservation created.");
        setSaving(false);
    }

    async function deleteReservation(id: number) {
        if (!window.confirm("Delete this reservation? This cannot be undone.")) {
            return;
        }

        const { error } = await supabase.from("reservations").delete().eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        await loadData();
        setMessage("Reservation deleted.");
    }

    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-black text-white">
                <Sidebar />

                <main className="min-h-screen flex-1 p-6 sm:p-10">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
                                    Ora CRM
                                </p>
                                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Reservations</h1>
                                <p className="mt-2 text-sm text-zinc-400">
                                    Create, update, and manage dinner, lounge, and VIP reservations.
                                </p>
                            </div>

                            <Link
                                href="/add-guest"
                                className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold transition hover:bg-white/5"
                            >
                                Add New Guest
                            </Link>
                        </div>

                        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="Total Reservations" value={totals.total} />
                            <StatCard label="Reservations Today" value={totals.today} />
                            <StatCard label="Confirmed" value={totals.confirmed} />
                            <StatCard label="Total Reserved Guests" value={totals.guests} />
                        </section>

                        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {editingId ? "Edit Reservation" : "New Reservation"}
                                    </h2>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Every reservation must be connected to an existing guest.
                                    </p>
                                </div>

                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
                            >
                                <label className="md:col-span-2">
                                    <span className="text-sm font-medium text-zinc-300">Guest</span>
                                    <select
                                        value={form.guest_id}
                                        onChange={(event) => updateForm("guest_id", event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-600"
                                        required
                                    >
                                        <option value="">Select a guest</option>
                                        {guests.map((guest) => (
                                            <option key={guest.id} value={guest.id}>
                                                {guest.name || `Guest #${guest.id}`}
                                                {guest.phone ? ` — ${guest.phone}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span className="text-sm font-medium text-zinc-300">
                                        Event
                                    </span>

                                    <select
                                        value={form.event_id}
                                        onChange={(event) => {
                                            const selectedEventId = event.target.value;
                                            const selectedEvent = events.find(
                                                (item) => String(item.id) === selectedEventId
                                            );

                                            setForm((current) => ({
                                                ...current,
                                                event_id: selectedEventId,
                                                reservation_date:
                                                    selectedEvent?.event_date ?? current.reservation_date,
                                            }));
                                        }}
                                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-600"
                                    >
                                        <option value="">No event selected</option>

                                        {events.map((event) => (
                                            <option key={event.id} value={event.id}>
                                                {event.name}
                                                {event.venue ? ` — ${event.venue}` : ""}
                                                {event.is_active ? " (Active)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {form.event_id ? (
                                    <label>
                                        <span className="text-sm font-medium text-zinc-300">
                                            Event Date
                                        </span>
                                        <div className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-300">
                                            {form.reservation_date
                                                ? formatDate(form.reservation_date)
                                                : "No date available"}
                                        </div>
                                    </label>
                                ) : (
                                    <Field
                                        label="Date"
                                        type="date"
                                        value={form.reservation_date}
                                        onChange={(value) =>
                                            updateForm("reservation_date", value)
                                        }
                                        required
                                    />
                                )}

                                <Field
                                    label="Time"
                                    type="time"
                                    value={form.reservation_time}
                                    onChange={(value) => updateForm("reservation_time", value)}
                                />

                                <Field
                                    label="Party Size"
                                    type="number"
                                    min="1"
                                    value={form.party_size}
                                    onChange={(value) => updateForm("party_size", value)}
                                    required
                                />

                                <Field
                                    label="Table Number"
                                    value={form.table_number}
                                    onChange={(value) => updateForm("table_number", value)}
                                    placeholder="Example: 12 or VIP-3"
                                />

                                <label>
                                    <span className="text-sm font-medium text-zinc-300">
                                        Reservation Type
                                    </span>
                                    <select
                                        value={form.reservation_type}
                                        onChange={(event) =>
                                            updateForm("reservation_type", event.target.value)
                                        }
                                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-600"
                                    >
                                        {TYPE_OPTIONS.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span className="text-sm font-medium text-zinc-300">Status</span>
                                    <select
                                        value={form.status}
                                        onChange={(event) => updateForm("status", event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-600"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="md:col-span-2 xl:col-span-4">
                                    <span className="text-sm font-medium text-zinc-300">Notes</span>
                                    <textarea
                                        value={form.notes}
                                        onChange={(event) => updateForm("notes", event.target.value)}
                                        rows={3}
                                        placeholder="Special requests, birthday, bottle service, host notes..."
                                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-600"
                                    />
                                </label>

                                <div className="md:col-span-2 xl:col-span-4">
                                    {message && (
                                        <p className="mb-4 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-300">
                                            {message}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving
                                            ? "Saving..."
                                            : editingId
                                                ? "Update Reservation"
                                                : "Create Reservation"}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">Reservation List</h2>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {filteredReservations.length} reservation
                                        {filteredReservations.length === 1 ? "" : "s"} shown
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search guest, phone, or table"
                                        className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-zinc-600"
                                    />

                                    <select
                                        value={statusFilter}
                                        onChange={(event) => setStatusFilter(event.target.value)}
                                        className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-zinc-600"
                                    >
                                        <option value="All">All statuses</option>
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {loading ? (
                                <p className="mt-6 text-sm text-zinc-500">Loading reservations...</p>
                            ) : filteredReservations.length === 0 ? (
                                <p className="mt-6 rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
                                    No reservations found.
                                </p>
                            ) : (
                                <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
                                    <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
                                        <thead className="bg-black text-zinc-500">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Guest</th>
                                                <th className="px-4 py-3 font-medium">Event</th>
                                                <th className="px-4 py-3 font-medium">Date</th>
                                                <th className="px-4 py-3 font-medium">Time</th>
                                                <th className="px-4 py-3 font-medium">Party</th>
                                                <th className="px-4 py-3 font-medium">Table</th>
                                                <th className="px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-zinc-800">
                                            {filteredReservations.map((reservation) => (
                                                <tr key={reservation.id} className="bg-zinc-950">
                                                    <td className="px-4 py-4">
                                                        <p className="font-semibold text-white">
                                                            {reservation.guests?.name ||
                                                                `Guest #${reservation.guest_id}`}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-500">
                                                            {reservation.guests?.phone || "No phone"}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4 text-zinc-300">
                                                        {reservation.events?.name || "No event"}
                                                    </td>

                                                    <td className="px-4 py-4 text-zinc-300">
                                                        {formatDate(reservation.reservation_date)}
                                                    </td>
                                                    <td className="px-4 py-4 text-zinc-300">
                                                        {formatTime(reservation.reservation_time)}
                                                    </td>
                                                    <td className="px-4 py-4 text-zinc-300">
                                                        {reservation.party_size}
                                                    </td>
                                                    <td className="px-4 py-4 text-zinc-300">
                                                        {reservation.table_number || "—"}
                                                    </td>
                                                    <td className="px-4 py-4 text-zinc-300">
                                                        {reservation.reservation_type}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                                                            {reservation.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEdit(reservation)}
                                                                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-900"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteReservation(reservation.id)}
                                                                className="rounded-lg border border-red-900 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </AdminGuard>
    );
}

type FieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    min?: string;
    placeholder?: string;
    required?: boolean;
};

function Field({
    label,
    value,
    onChange,
    type = "text",
    min,
    placeholder,
    required = false,
}: FieldProps) {
    return (
        <label>
            <span className="text-sm font-medium text-zinc-300">{label}</span>
            <input
                type={type}
                min={min}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-600"
            />
        </label>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
    );
}
