"use client";

import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type EventInfo = {
    id: number;
    name: string;
    venue: string;
    eventDate: string;
};

type GuestResult = {
    entryId: number;
    name: string;
    vipLevel: string;
    tag: string;
    status: string;
    checkedIn: boolean;
};

type SearchResponse = {
    event?: EventInfo;
    guests?: GuestResult[];
    error?: string;
};

type CheckInResponse = {
    success?: boolean;
    alreadyCheckedIn?: boolean;
    guest?: {
        entryId: number;
        name: string;
        status: string;
    };
    error?: string;
};

type EventStats = {
    totalGuests: number;
    checkedIn: number;
    remaining: number;
    attendanceRate: number;
    noShowRate: number;
};

type CheckedInGuest = {
    entryId: number;
    name: string;
    vipLevel: string;
    tag: string;
};

type RemainingGuest = {
    entryId: number;
    name: string;
    vipLevel: string;
    tag: string;
    status: string;
};

type EventStatusResponse = {
    viewerRole?: "admin" | "host";
    event?: EventInfo;
    stats?: EventStats;
    checkedInGuests?: CheckedInGuest[];
    remainingGuests?: RemainingGuest[];
    error?: string;
};

type AddGuestResponse = {
    success?: boolean;
    existingRegistration?: boolean;
    alreadyCheckedIn?: boolean;
    event?: EventInfo;
    guest?: {
        entryId: number;
        guestId: number | null;
        name: string;
        vipLevel: string;
        tag?: string;
        status: string;
    };
    error?: string;
};

export default function HostCheckInPage() {
    const router = useRouter();

    const supabase = useMemo(() => {
        const supabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL;

        const supabaseAnonKey =
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error(
                "Missing Supabase environment variables."
            );
        }

        return createBrowserClient(
            supabaseUrl,
            supabaseAnonKey
        );
    }, []);

    const [name, setName] = useState("");
    const [lastFour, setLastFour] = useState("");

    const [showWalkInForm, setShowWalkInForm] =
        useState(false);

    const [walkInName, setWalkInName] =
        useState("");

    const [walkInPhone, setWalkInPhone] =
        useState("");

    const [walkInVipLevel, setWalkInVipLevel] =
        useState("Regular");

    const [addingWalkIn, setAddingWalkIn] =
        useState(false);

    const [event, setEvent] =
        useState<EventInfo | null>(null);

    const [guests, setGuests] =
        useState<GuestResult[]>([]);

    const [stats, setStats] =
        useState<EventStats>({
            totalGuests: 0,
            checkedIn: 0,
            remaining: 0,
            attendanceRate: 0,
            noShowRate: 0,
        });

    const [
        checkedInGuests,
        setCheckedInGuests,
    ] = useState<CheckedInGuest[]>([]);

    const [viewerRole, setViewerRole] =
        useState<"admin" | "host">("host");

    const [
        remainingGuests,
        setRemainingGuests,
    ] = useState<RemainingGuest[]>([]);

    const [loading, setLoading] =
        useState(false);

    const [
        loadingEventStatus,
        setLoadingEventStatus,
    ] = useState(true);

    const [
        checkingInId,
        setCheckingInId,
    ] = useState<number | null>(null);

    const [
        checkingOutId,
        setCheckingOutId,
    ] = useState<number | null>(null);

    const [
        checkingSession,
        setCheckingSession,
    ] = useState(true);

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState<
            "success" | "error" | "info"
        >("info");

    const getAccessToken =
        useCallback(async () => {
            const {
                data,
                error,
            } =
                await supabase.auth.getSession();

            if (error) {
                throw new Error(
                    `Unable to verify your session: ${error.message}`
                );
            }

            const accessToken =
                data.session?.access_token;

            if (!accessToken) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            return accessToken;
        }, [supabase]);

    const loadEventStatus =
        useCallback(async () => {
            setLoadingEventStatus(true);

            try {
                const accessToken =
                    await getAccessToken();

                const response = await fetch(
                    "/api/host/event-status",
                    {
                        method: "GET",
                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },
                        cache: "no-store",
                    }
                );

                const result =
                    (await response.json()) as EventStatusResponse;

                if (response.status === 401) {
                    await supabase.auth.signOut();

                    router.replace(
                        "/login?redirect=/host/check-in"
                    );

                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        "The event status could not be loaded."
                    );
                }

                setEvent(
                    result.event ?? null
                );

                setViewerRole(
                    result.viewerRole ?? "host"
                );

                setStats(
                    result.stats ?? {
                        totalGuests: 0,
                        checkedIn: 0,
                        remaining: 0,
                        attendanceRate: 0,
                        noShowRate: 0,
                    }
                );

                setCheckedInGuests(
                    result.checkedInGuests ?? []
                );

                setRemainingGuests(
                    result.remainingGuests ?? []
                );
            } catch (error) {
                console.error(
                    "Event status error:",
                    error
                );

                setMessageType("error");

                setMessage(
                    error instanceof Error
                        ? error.message
                        : "The event status could not be loaded."
                );
            } finally {
                setLoadingEventStatus(false);
            }
        }, [
            getAccessToken,
            router,
            supabase,
        ]);

    useEffect(() => {
        async function verifySession() {
            const {
                data: { user },
                error,
            } =
                await supabase.auth.getUser();

            if (error || !user) {
                router.replace(
                    "/login?redirect=/host/check-in"
                );

                return;
            }

            setCheckingSession(false);

            await loadEventStatus();
        }

        void verifySession();
    }, [
        loadEventStatus,
        router,
        supabase,
    ]);

    async function handleSearch(
        eventObject: FormEvent<HTMLFormElement>
    ) {
        eventObject.preventDefault();

        setMessage("");
        setGuests([]);

        const cleanName =
            name.trim();

        const cleanLastFour =
            lastFour.replace(/\D/g, "");

        if (cleanName.length < 2) {
            setMessageType("error");

            setMessage(
                "Enter at least 2 letters of the guest name."
            );

            return;
        }

        if (
            cleanLastFour.length !== 4
        ) {
            setMessageType("error");

            setMessage(
                "Enter exactly the last 4 phone digits."
            );

            return;
        }

        setLoading(true);

        try {
            const accessToken =
                await getAccessToken();

            const response = await fetch(
                "/api/host/guest-search",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        name: cleanName,
                        lastFour:
                            cleanLastFour,
                    }),
                }
            );

            const result =
                (await response.json()) as SearchResponse;

            if (response.status === 401) {
                await supabase.auth.signOut();

                router.replace(
                    "/login?redirect=/host/check-in"
                );

                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "The guest search failed."
                );
            }

            if (result.event) {
                setEvent(result.event);
            }

            setGuests(
                result.guests ?? []
            );

            if (
                !result.guests ||
                result.guests.length === 0
            ) {
                setMessageType("info");

                setMessage(
                    "No matching guest was found for the active event."
                );
            } else {
                setMessageType("success");

                setMessage(
                    `${result.guests.length} matching guest${result.guests.length === 1
                        ? ""
                        : "s"
                    } found.`
                );
            }
        } catch (error) {
            console.error(
                "Host guest search error:",
                error
            );

            setMessageType("error");

            setMessage(
                error instanceof Error
                    ? error.message
                    : "The guest search failed."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckIn(
        entryId: number
    ) {
        setMessage("");
        setCheckingInId(entryId);

        try {
            const accessToken =
                await getAccessToken();

            const response = await fetch(
                "/api/host/check-in",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        entryId,
                    }),
                }
            );

            const result =
                (await response.json()) as CheckInResponse;

            if (response.status === 401) {
                await supabase.auth.signOut();

                router.replace(
                    "/login?redirect=/host/check-in"
                );

                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "The guest could not be checked in."
                );
            }

            setGuests(
                (currentGuests) =>
                    currentGuests.map(
                        (guest) =>
                            guest.entryId === entryId
                                ? {
                                    ...guest,
                                    status:
                                        "checked_in",
                                    checkedIn: true,
                                }
                                : guest
                    )
            );

            await loadEventStatus();

            setMessageType("success");

            if (
                result.alreadyCheckedIn
            ) {
                setMessage(
                    `${result.guest?.name || "Guest"} was already checked in.`
                );
            } else {
                setMessage(
                    `${result.guest?.name || "Guest"} has been checked in successfully.`
                );
            }
        } catch (error) {
            console.error(
                "Host check-in error:",
                error
            );

            setMessageType("error");

            setMessage(
                error instanceof Error
                    ? error.message
                    : "The guest could not be checked in."
            );
        } finally {
            setCheckingInId(null);
        }
    }

    async function handleCheckOut(
        entryId: number
    ) {
        setMessage("");
        setCheckingOutId(entryId);

        try {
            const accessToken =
                await getAccessToken();

            const response = await fetch(
                "/api/host/check-in",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        entryId,
                        action: "check_out",
                    }),
                }
            );

            const result =
                (await response.json()) as CheckInResponse;

            if (response.status === 401) {
                await supabase.auth.signOut();

                router.replace(
                    "/login?redirect=/host/check-in"
                );

                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "The guest could not be checked out."
                );
            }

            setGuests(
                (currentGuests) =>
                    currentGuests.map(
                        (guest) =>
                            guest.entryId === entryId
                                ? {
                                    ...guest,
                                    status:
                                        "confirmed",
                                    checkedIn: false,
                                }
                                : guest
                    )
            );

            await loadEventStatus();

            setMessageType("success");

            setMessage(
                `${result.guest?.name || "Guest"} has been checked out successfully.`
            );
        } catch (error) {
            console.error(
                "Host check-out error:",
                error
            );

            setMessageType("error");

            setMessage(
                error instanceof Error
                    ? error.message
                    : "The guest could not be checked out."
            );
        } finally {
            setCheckingOutId(null);
        }
    }

    async function handleAddWalkIn(
        eventObject: FormEvent<HTMLFormElement>
    ) {
        eventObject.preventDefault();

        setMessage("");

        const cleanName =
            walkInName.trim();

        const cleanPhone =
            walkInPhone.trim();

        if (cleanName.length < 2) {
            setMessageType("error");
            setMessage(
                "Enter the walk-in guest's full name."
            );
            return;
        }

        if (
            cleanPhone.replace(/\D/g, "").length < 10
        ) {
            setMessageType("error");
            setMessage(
                "Enter a valid phone number with the area code."
            );
            return;
        }

        setAddingWalkIn(true);

        try {
            const accessToken =
                await getAccessToken();

            const response = await fetch(
                "/api/host/add-guest",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        name: cleanName,
                        phone: cleanPhone,
                        vipLevel:
                            walkInVipLevel,
                    }),
                }
            );

            const responseText =
                await response.text();

            let result: AddGuestResponse;

            try {
                result = JSON.parse(
                    responseText
                ) as AddGuestResponse;
            } catch {
                console.error(
                    "Add Guest API returned non-JSON:",
                    {
                        status: response.status,
                        url: response.url,
                        responseText,
                    }
                );

                throw new Error(
                    `The Add Guest API returned an HTML error page (${response.status}). Check the PowerShell server window.`
                );
            }

            if (response.status === 401) {
                await supabase.auth.signOut();

                router.replace(
                    "/login?redirect=/host/check-in"
                );

                return;
            }

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "The walk-in guest could not be added."
                );
            }

            await loadEventStatus();

            setWalkInName("");
            setWalkInPhone("");
            setWalkInVipLevel("Regular");
            setShowWalkInForm(false);

            setMessageType("success");

            if (
                result.existingRegistration &&
                result.alreadyCheckedIn
            ) {
                setMessage(
                    `${result.guest?.name || cleanName} was already registered and checked in.`
                );
            } else if (
                result.existingRegistration
            ) {
                setMessage(
                    `${result.guest?.name || cleanName} was already registered and has now been checked in.`
                );
            } else {
                setMessage(
                    `${result.guest?.name || cleanName} was added to the active event and checked in.`
                );
            }
        } catch (error) {
            console.error(
                "Add walk-in guest error:",
                error
            );

            setMessageType("error");

            setMessage(
                error instanceof Error
                    ? error.message
                    : "The walk-in guest could not be added."
            );
        } finally {
            setAddingWalkIn(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();

        router.replace("/login");
        router.refresh();
    }

    function resetSearch() {
        setName("");
        setLastFour("");
        setGuests([]);
        setMessage("");
    }

    if (checkingSession) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
                <p className="text-sm text-zinc-400">
                    Checking host session...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                            Ora CRM
                        </p>

                        <h1 className="mt-1 text-3xl font-bold">
                            Host Check-In
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void handleLogout()
                        }
                        className="min-h-12 rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-300 active:scale-[0.98]"
                    >
                        Log Out
                    </button>
                </header>

                {event ? (
                    <section className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                            Active Event
                        </p>

                        <h2 className="mt-2 text-xl font-bold">
                            {event.name}
                        </h2>

                        <p className="mt-1 text-sm text-emerald-100/80">
                            {event.venue}
                        </p>

                        <p className="mt-1 text-sm text-emerald-100/80">
                            {new Intl.DateTimeFormat(
                                "en-CA",
                                {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                }
                            ).format(
                                new Date(
                                    `${event.eventDate}T12:00:00`
                                )
                            )}
                        </p>
                    </section>
                ) : null}

                <section className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-center">
                        <p className="text-2xl font-bold">
                            {loadingEventStatus
                                ? "—"
                                : stats.totalGuests}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                            Total
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-300">
                            {loadingEventStatus
                                ? "—"
                                : stats.checkedIn}
                        </p>

                        <p className="mt-1 text-xs text-emerald-200/70">
                            Checked In
                        </p>
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                        <p className="text-2xl font-bold text-amber-300">
                            {loadingEventStatus
                                ? "—"
                                : stats.remaining}
                        </p>

                        <p className="mt-1 text-xs text-amber-200/70">
                            Remaining
                        </p>
                    </div>
                </section>

                <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
                    <div>
                        <h2 className="text-xl font-bold">
                            Find Guest
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                            Search using the guest name and the last 4 digits of their phone number.
                        </p>
                    </div>

                    <form
                        onSubmit={(eventObject) =>
                            void handleSearch(
                                eventObject
                            )
                        }
                        className="mt-6 space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="guest-name"
                                className="mb-2 block text-sm font-semibold text-zinc-300"
                            >
                                Guest name
                            </label>

                            <input
                                id="guest-name"
                                type="text"
                                autoComplete="off"
                                autoCapitalize="words"
                                value={name}
                                onChange={(eventObject) =>
                                    setName(
                                        eventObject.target.value
                                    )
                                }
                                placeholder="Example: Jessica"
                                disabled={loading}
                                className="h-14 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="last-four"
                                className="mb-2 block text-sm font-semibold text-zinc-300"
                            >
                                Last 4 phone digits
                            </label>

                            <input
                                id="last-four"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                value={lastFour}
                                onChange={(eventObject) => {
                                    const digits =
                                        eventObject.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 4);

                                    setLastFour(digits);
                                }}
                                placeholder="4821"
                                maxLength={4}
                                disabled={loading}
                                className="h-14 w-full rounded-xl border border-white/10 bg-black px-4 text-xl tracking-[0.25em] outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10 disabled:opacity-60"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="h-14 w-full rounded-xl bg-white px-5 text-base font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading
                                ? "Searching..."
                                : "Search Guest"}
                        </button>
                    </form>
                </section>

                <section className="mt-5 rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5">
                    <button
                        type="button"
                        onClick={() =>
                            setShowWalkInForm(
                                (current) =>
                                    !current
                            )
                        }
                        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl bg-blue-500 px-5 text-left font-bold text-white transition active:scale-[0.98]"
                    >
                        <span>
                            + Add Walk-In Guest
                        </span>

                        <span className="text-xl">
                            {showWalkInForm
                                ? "−"
                                : "+"}
                        </span>
                    </button>

                    {showWalkInForm ? (
                        <form
                            onSubmit={(eventObject) =>
                                void handleAddWalkIn(
                                    eventObject
                                )
                            }
                            className="mt-5 space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="walk-in-name"
                                    className="mb-2 block text-sm font-semibold text-zinc-300"
                                >
                                    Guest name
                                </label>

                                <input
                                    id="walk-in-name"
                                    type="text"
                                    autoComplete="off"
                                    autoCapitalize="words"
                                    value={walkInName}
                                    onChange={(eventObject) =>
                                        setWalkInName(
                                            eventObject.target.value
                                        )
                                    }
                                    placeholder="Full name"
                                    disabled={addingWalkIn}
                                    className="h-14 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="walk-in-phone"
                                    className="mb-2 block text-sm font-semibold text-zinc-300"
                                >
                                    Phone number
                                </label>

                                <input
                                    id="walk-in-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={walkInPhone}
                                    onChange={(eventObject) =>
                                        setWalkInPhone(
                                            eventObject.target.value
                                        )
                                    }
                                    placeholder="514-555-1234"
                                    disabled={addingWalkIn}
                                    className="h-14 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="walk-in-vip"
                                    className="mb-2 block text-sm font-semibold text-zinc-300"
                                >
                                    Guest type
                                </label>

                                <select
                                    id="walk-in-vip"
                                    value={walkInVipLevel}
                                    onChange={(eventObject) =>
                                        setWalkInVipLevel(
                                            eventObject.target.value
                                        )
                                    }
                                    disabled={addingWalkIn}
                                    className="h-14 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                >
                                    <option value="Regular">
                                        Regular
                                    </option>

                                    <option value="VIP">
                                        VIP
                                    </option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={addingWalkIn}
                                className="h-14 w-full rounded-xl bg-white px-5 text-base font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {addingWalkIn
                                    ? "Adding Guest..."
                                    : "Add and Check In"}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowWalkInForm(false)
                                }
                                disabled={addingWalkIn}
                                className="h-12 w-full rounded-xl border border-white/10 text-sm font-semibold text-zinc-300 active:scale-[0.98] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </form>
                    ) : null}
                </section>

                {message ? (
                    <div
                        className={`mt-5 rounded-2xl border p-4 text-sm ${messageType ===
                            "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : messageType ===
                                "error"
                                ? "border-red-500/30 bg-red-500/10 text-red-200"
                                : "border-blue-500/30 bg-blue-500/10 text-blue-200"
                            }`}
                    >
                        {message}
                    </div>
                ) : null}

                {guests.length > 0 ? (
                    <section className="mt-5 space-y-4">
                        {guests.map(
                            (guest) => (
                                <article
                                    key={
                                        guest.entryId
                                    }
                                    className="rounded-3xl border border-white/10 bg-zinc-950 p-5"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold">
                                                {guest.name}
                                            </h3>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-200">
                                                    {guest.vipLevel}
                                                </span>

                                                {guest.tag &&
                                                    guest.tag !==
                                                    guest.vipLevel ? (
                                                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-200">
                                                        {guest.tag}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${guest.checkedIn
                                                ? "bg-emerald-500/15 text-emerald-300"
                                                : "bg-amber-500/15 text-amber-300"
                                                }`}
                                        >
                                            {guest.checkedIn
                                                ? "Checked In"
                                                : "Not Checked In"}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            guest.checkedIn ||
                                            checkingInId ===
                                            guest.entryId
                                        }
                                        onClick={() =>
                                            void handleCheckIn(
                                                guest.entryId
                                            )
                                        }
                                        className={`mt-5 h-14 w-full rounded-xl px-5 text-base font-bold transition active:scale-[0.98] disabled:cursor-not-allowed ${guest.checkedIn
                                            ? "bg-emerald-500/15 text-emerald-300"
                                            : "bg-white text-black disabled:opacity-60"
                                            }`}
                                    >
                                        {checkingInId ===
                                            guest.entryId
                                            ? "Checking In..."
                                            : guest.checkedIn
                                                ? "Already Checked In"
                                                : "Check In Guest"}
                                    </button>
                                </article>
                            )
                        )}
                    </section>
                ) : null}

                {guests.length > 0 ? (
                    <button
                        type="button"
                        onClick={resetSearch}
                        className="mt-5 h-12 w-full rounded-xl border border-white/10 text-sm font-semibold text-zinc-300 active:scale-[0.98]"
                    >
                        Search Another Guest
                    </button>
                ) : null}

                {viewerRole === "admin" ? (
                    <section className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                                    Admin Only
                                </p>

                                <h2 className="mt-2 text-xl font-bold">
                                    Remaining / No-Show Guests
                                </h2>

                                <p className="mt-1 text-sm text-zinc-400">
                                    Guests who have not checked in to the active event.
                                </p>
                            </div>

                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-300">
                                {remainingGuests.length}
                            </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black p-4">
                                <p className="text-2xl font-bold">
                                    {stats.attendanceRate}%
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                    Attendance Rate
                                </p>
                            </div>

                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                                <p className="text-2xl font-bold text-amber-300">
                                    {stats.noShowRate}%
                                </p>

                                <p className="mt-1 text-xs text-amber-200/70">
                                    No-Show Rate
                                </p>
                            </div>
                        </div>

                        {remainingGuests.length === 0 ? (
                            <div className="mt-5 rounded-2xl border border-dashed border-emerald-500/20 p-6 text-center">
                                <p className="text-sm text-emerald-300">
                                    Everyone has checked in.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 space-y-3">
                                {remainingGuests.map(
                                    (guest, index) => (
                                        <div
                                            key={guest.entryId}
                                            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black p-4"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-300">
                                                    {index + 1}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold">
                                                        {guest.name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-zinc-500">
                                                        {guest.vipLevel}

                                                        {guest.tag &&
                                                            guest.tag !== guest.vipLevel
                                                            ? ` · ${guest.tag}`
                                                            : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-shrink-0 flex-col items-end gap-2">
                                                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                                                    Not Checked In
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleCheckIn(
                                                            guest.entryId
                                                        )
                                                    }
                                                    disabled={
                                                        checkingInId ===
                                                        guest.entryId
                                                    }
                                                    className="min-h-11 rounded-xl bg-white px-4 text-xs font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {checkingInId ===
                                                        guest.entryId
                                                        ? "Checking In..."
                                                        : "Check In"}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>
                ) : null}

                <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">
                                Checked-In Guests
                            </h2>

                            <p className="mt-1 text-sm text-zinc-400">
                                Guests currently checked into the event.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void loadEventStatus()
                            }
                            disabled={
                                loadingEventStatus
                            }
                            className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-300 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loadingEventStatus
                                ? "Loading..."
                                : "Refresh"}
                        </button>
                    </div>

                    {checkedInGuests.length ===
                        0 ? (
                        <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center">
                            <p className="text-sm text-zinc-500">
                                No guests have checked in yet.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {checkedInGuests.map(
                                (
                                    guest,
                                    index
                                ) => (
                                    <div
                                        key={
                                            guest.entryId
                                        }
                                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black p-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-300">
                                                {index +
                                                    1}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate font-semibold">
                                                    {
                                                        guest.name
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {
                                                        guest.vipLevel
                                                    }

                                                    {guest.tag &&
                                                        guest.tag !==
                                                        guest.vipLevel
                                                        ? ` · ${guest.tag}`
                                                        : ""}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-shrink-0 flex-col items-end gap-2">
                                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                                                Checked In
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void handleCheckOut(
                                                        guest.entryId
                                                    )
                                                }
                                                disabled={
                                                    checkingOutId ===
                                                    guest.entryId
                                                }
                                                className="min-h-11 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-xs font-bold text-red-300 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {checkingOutId ===
                                                    guest.entryId
                                                    ? "Checking Out..."
                                                    : "Check Out"}
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>

                <footer className="mt-auto pt-10 text-center">
                    <p className="text-xs leading-5 text-zinc-600">
                        Guest phone numbers, emails, Instagram accounts, and private notes are hidden from hosts.
                    </p>
                </footer>
            </div>
        </main>
    );
}