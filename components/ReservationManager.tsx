"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Guest = {
    id: number;
    name: string | null;
    phone: string | null;
};

type Reservation = {
    id: number;
    guest_id: number;
    reservation_date: string;
    reservation_time: string;
    party_size: number;
    table_number: string | null;
    reservation_type: string;
    status: string;
    notes: string | null;
    created_at: string;
    guest?: {
        name: string | null;
        phone: string | null;
    } | null;
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

const emptyForm: ReservationForm = {
    guest_id: "",
    reservation_date: "",
    reservation_time: "",
    party_size: "2",
    table_number: "",
    reservation_type: "Dinner",
    status: "Pending",
    notes: "",
};

export default function ReservationManager() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [form, setForm] = useState<ReservationForm>(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        void loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setMessage("");

        const [guestResult, reservationResult] = await Promise.all([
            supabase
                .from("guests")
                .select("id, name, phone")
                .order("name", { ascending: true }),

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
                    created_at,
                    guest:guests (
                        name,
                        phone
                    )
                `)
                .order("reservation_date", { ascending: true })
                .order("reservation_time", { ascending: true }),
        ]);

        if (guestResult.error) {
            console.error(guestResult.error);
            setMessage(`Could not load guests: ${guestResult.error.message}`);
        } else {
            setGuests(guestResult.data ?? []);
        }

        if (reservationResult.error) {
            console.error(reservationResult.error);
            setMessage(
                `Could not load reservations: ${reservationResult.error.message}`
            );
        } else {
            setReservations(
                (reservationResult.data as unknown as Reservation[]) ?? []
            );
        }

        setLoading(false);
    }

    function updateForm(
        field: keyof ReservationForm,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function createReservation(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");

        if (
            !form.guest_id ||
            !form.reservation_date ||
            !form.reservation_time ||
            !form.party_size
        ) {
            setMessage(
                "Guest, date, time, and party size are required."
            );
            return;
        }

        const partySize = Number(form.party_size);

        if (!Number.isInteger(partySize) || partySize < 1) {
            setMessage("Party size must be at least 1.");
            return;
        }

        setSaving(true);

        const { error } = await supabase
            .from("reservations")
            .insert({
                guest_id: Number(form.guest_id),
                reservation_date: form.reservation_date,
                reservation_time: form.reservation_time,
                party_size: partySize,
                table_number:
                    form.table_number.trim() || null,
                reservation_type: form.reservation_type,
                status: form.status,
                notes: form.notes.trim() || null,
            });

        if (error) {
            console.error(error);
            setMessage(`Could not save reservation: ${error.message}`);
            setSaving(false);
            return;
        }

        setForm(emptyForm);
        setMessage("Reservation created successfully.");
        setSaving(false);
        await loadData();
    }

    async function updateReservationStatus(
        reservationId: number,
        status: string
    ) {
        setMessage("");

        const { error } = await supabase
            .from("reservations")
            .update({ status })
            .eq("id", reservationId);

        if (error) {
            console.error(error);
            setMessage(`Could not update status: ${error.message}`);
            return;
        }

        setReservations((current) =>
            current.map((reservation) =>
                reservation.id === reservationId
                    ? { ...reservation, status }
                    : reservation
            )
        );
    }

    async function deleteReservation(
        reservationId: number
    ) {
        const confirmed = window.confirm(
            "Delete this reservation? The guest will remain in your CRM."
        );

        if (!confirmed) return;

        setMessage("");

        const { error } = await supabase
            .from("reservations")
            .delete()
            .eq("id", reservationId);

        if (error) {
            console.error(error);
            setMessage(`Could not delete reservation: ${error.message}`);
            return;
        }

        setReservations((current) =>
            current.filter(
                (reservation) =>
                    reservation.id !== reservationId
            )
        );

        setMessage("Reservation deleted.");
    }

    const filteredReservations = useMemo(() => {
        const normalizedSearch = search
            .trim()
            .toLowerCase();

        if (!normalizedSearch) {
            return reservations;
        }

        return reservations.filter((reservation) => {
            const name =
                reservation.guest?.name?.toLowerCase() ?? "";
            const phone =
                reservation.guest?.phone?.toLowerCase() ?? "";
            const table =
                reservation.table_number?.toLowerCase() ?? "";
            const status =
                reservation.status.toLowerCase();

            return (
                name.includes(normalizedSearch) ||
                phone.includes(normalizedSearch) ||
                table.includes(normalizedSearch) ||
                status.includes(normalizedSearch)
            );
        });
    }, [reservations, search]);

    return (
        <div className="space-y-10">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <div>
                    <h2 className="text-2xl font-bold">
                        Add Dinner Reservation
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                        Create a reservation without changing the guest record.
                    </p>
                </div>

                <form
                    onSubmit={createReservation}
                    className="mt-8 grid gap-5 md:grid-cols-2"
                >
                    <Field label="Guest">
                        <select
                            value={form.guest_id}
                            onChange={(event) =>
                                updateForm(
                                    "guest_id",
                                    event.target.value
                                )
                            }
                            className="input-style"
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
                                    {guest.name || "Unnamed guest"}
                                    {guest.phone
                                        ? ` · ${guest.phone}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Reservation Type">
                        <select
                            value={form.reservation_type}
                            onChange={(event) =>
                                updateForm(
                                    "reservation_type",
                                    event.target.value
                                )
                            }
                            className="input-style"
                        >
                            <option value="Dinner">
                                Dinner
                            </option>
                            <option value="VIP Table">
                                VIP Table
                            </option>
                            <option value="Guest List">
                                Guest List
                            </option>
                        </select>
                    </Field>

                    <Field label="Date">
                        <input
                            type="date"
                            value={form.reservation_date}
                            onChange={(event) =>
                                updateForm(
                                    "reservation_date",
                                    event.target.value
                                )
                            }
                            className="input-style"
                            required
                        />
                    </Field>

                    <Field label="Time">
                        <input
                            type="time"
                            value={form.reservation_time}
                            onChange={(event) =>
                                updateForm(
                                    "reservation_time",
                                    event.target.value
                                )
                            }
                            className="input-style"
                            required
                        />
                    </Field>

                    <Field label="Party Size">
                        <input
                            type="number"
                            min="1"
                            value={form.party_size}
                            onChange={(event) =>
                                updateForm(
                                    "party_size",
                                    event.target.value
                                )
                            }
                            className="input-style"
                            required
                        />
                    </Field>

                    <Field label="Table Number">
                        <input
                            type="text"
                            value={form.table_number}
                            onChange={(event) =>
                                updateForm(
                                    "table_number",
                                    event.target.value
                                )
                            }
                            placeholder="Example: T12 or VIP 3"
                            className="input-style"
                        />
                    </Field>

                    <Field label="Status">
                        <select
                            value={form.status}
                            onChange={(event) =>
                                updateForm(
                                    "status",
                                    event.target.value
                                )
                            }
                            className="input-style"
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
                        </select>
                    </Field>

                    <div className="md:col-span-2">
                        <Field label="Notes">
                            <textarea
                                value={form.notes}
                                onChange={(event) =>
                                    updateForm(
                                        "notes",
                                        event.target.value
                                    )
                                }
                                placeholder="Birthday, special request, bottle service, allergies..."
                                rows={4}
                                className="input-style resize-none"
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-lg bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {saving
                                ? "Saving..."
                                : "Create Reservation"}
                        </button>
                    </div>
                </form>

                {message && (
                    <p className="mt-5 text-sm text-zinc-300">
                        {message}
                    </p>
                )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">
                            Reservations
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                            {filteredReservations.length} reservation
                            {filteredReservations.length === 1
                                ? ""
                                : "s"}
                        </p>
                    </div>

                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search guest, phone, table..."
                        className="input-style w-full sm:max-w-sm"
                    />
                </div>

                {loading ? (
                    <p className="mt-8 text-sm text-zinc-400">
                        Loading reservations...
                    </p>
                ) : filteredReservations.length === 0 ? (
                    <div className="mt-8 rounded-xl border border-zinc-800 bg-black p-8 text-center text-sm text-zinc-500">
                        No reservations found.
                    </div>
                ) : (
                    <div className="mt-8 space-y-4">
                        {filteredReservations.map(
                            (reservation) => (
                                <article
                                    key={reservation.id}
                                    className="rounded-xl border border-zinc-800 bg-black p-5"
                                >
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold">
                                                {reservation.guest
                                                    ?.name ||
                                                    "Unknown Guest"}
                                            </h3>

                                            <p className="mt-1 text-sm text-zinc-500">
                                                {reservation.guest
                                                    ?.phone ||
                                                    "No phone number"}
                                            </p>

                                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                                                <Badge>
                                                    {
                                                        reservation.reservation_date
                                                    }
                                                </Badge>

                                                <Badge>
                                                    {
                                                        reservation.reservation_time
                                                    }
                                                </Badge>

                                                <Badge>
                                                    {
                                                        reservation.party_size
                                                    }{" "}
                                                    people
                                                </Badge>

                                                <Badge>
                                                    {reservation.table_number ||
                                                        "No table"}
                                                </Badge>

                                                <Badge>
                                                    {
                                                        reservation.reservation_type
                                                    }
                                                </Badge>
                                            </div>

                                            {reservation.notes && (
                                                <p className="mt-4 text-sm text-zinc-400">
                                                    {
                                                        reservation.notes
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
                                            <select
                                                value={
                                                    reservation.status
                                                }
                                                onChange={(event) =>
                                                    void updateReservationStatus(
                                                        reservation.id,
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                className="input-style min-w-40"
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
                                            </select>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void deleteReservation(
                                                        reservation.id
                                                    )
                                                }
                                                className="rounded-lg border border-red-900 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            )
                        )}
                    </div>
                )}
            </section>

            <style jsx>{`
                .input-style {
                    width: 100%;
                    border-radius: 0.5rem;
                    border: 1px solid rgb(63 63 70);
                    background: black;
                    padding: 0.75rem 1rem;
                    color: white;
                    outline: none;
                }

                .input-style:focus {
                    border-color: rgb(161 161 170);
                }
            `}</style>
        </div>
    );
}

type FieldProps = {
    label: string;
    children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">
                {label}
            </span>

            {children}
        </label>
    );
}

type BadgeProps = {
    children: React.ReactNode;
};

function Badge({ children }: BadgeProps) {
    return (
        <span className="rounded-full border border-zinc-700 px-3 py-1">
            {children}
        </span>
    );
}
