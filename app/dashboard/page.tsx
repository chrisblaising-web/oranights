import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

type Guest = {
    id: number;
    created_at: string;
    birthday: string | null;
    gender: string | null;
    vip_level: string | null;
    tag: string | null;
};

type Reservation = {
    id: number;
    event_id: number | null;
    reservation_date: string;
    reservation_time: string | null;
    party_size: number;
    table_number: string | null;
    reservation_type: string;
    status: string;
};

type SmsLog = {
    id: number;
    guest_id: number | null;
    campaign: string | null;
    audience: string | null;
    phone: string | null;
    message: string | null;
    status: string | null;
    created_at: string;
};

type SmsReply = {
    id: number;
    guest_id: number | null;
    guest_name: string | null;
    phone: string | null;
    message: string | null;
    direction: string;
    created_at: string;
};

type EventRecord = {
    id: number;
    name: string;
    venue: string | null;
    event_date: string;
    is_active: boolean;
};

type CampaignForm = {
    id: number;
    event_id: number | null;
    is_active: boolean;
};

type FormSubmission = {
    id: number;
    form_id: number;
    created_at: string;
};

type GuestListEntry = {
    id: number;
    event_id: number;
    status: string;
};

function percentage(value: number, total: number) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

function formatDateTime(date: string) {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Toronto",
    }).format(new Date(date));
}

function getCurrentWeekRange() {
    const now = new Date();

    const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);

    const year = Number(dateParts.find((part) => part.type === "year")?.value);
    const month = Number(dateParts.find((part) => part.type === "month")?.value);
    const day = Number(dateParts.find((part) => part.type === "day")?.value);

    const localDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = localDate.getUTCDay();
    const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;

    const monday = new Date(localDate);
    monday.setUTCDate(localDate.getUTCDate() - daysSinceMonday);

    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(monday.getUTCDate() + 7);

    return {
        startDate: monday.toISOString().slice(0, 10),
        endDate: nextMonday.toISOString().slice(0, 10),
    };
}

function isYesReply(message: string | null) {
    if (!message) return false;

    const normalized = message
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ");

    return [
        "yes",
        "y",
        "oui",
        "ouais",
        "yeah",
        "yep",
        "confirmed",
        "confirm",
        "je confirme",
    ].includes(normalized);
}

export default async function DashboardPage() {
    await requireAdmin("/dashboard");
    const [
        { data: guests, error: guestsError },
        { data: reservations, error: reservationsError },
        { data: smsLogs, error: smsLogsError },
        { data: smsReplies, error: smsRepliesError },
        { data: events, error: eventsError },
        { data: forms, error: formsError },
        { data: formSubmissions, error: formSubmissionsError },
        { data: guestListEntries, error: guestListEntriesError },
    ] = await Promise.all([
        supabase
            .from("guests")
            .select(`
                id,
                created_at,
                birthday,
                gender,
                vip_level,
                tag
            `)
            .order("created_at", { ascending: false }),

        supabase
            .from("reservations")
            .select(`
                id,
                event_id,
                reservation_date,
                reservation_time,
                party_size,
                table_number,
                reservation_type,
                status
            `)
            .eq("reservation_type", "Dinner")
            .order("reservation_date", { ascending: true })
            .order("reservation_time", { ascending: true }),

        supabase
            .from("sms_logs")
            .select(`
                id,
                guest_id,
                campaign,
                audience,
                phone,
                message,
                status,
                created_at
            `)
            .order("created_at", { ascending: false }),

        supabase
            .from("sms_messages")
            .select(`
                id,
                guest_id,
                guest_name,
                phone,
                message,
                direction,
                created_at
            `)
            .eq("direction", "inbound")
            .order("created_at", { ascending: false }),

        supabase
            .from("events")
            .select(`
                id,
                name,
                venue,
                event_date,
                is_active
            `)
            .order("event_date", { ascending: false }),

        supabase
            .from("forms")
            .select(`
                id,
                event_id,
                is_active
            `),

        supabase
            .from("form_submissions")
            .select(`
                id,
                form_id,
                created_at
            `)
            .order("created_at", { ascending: false }),

        supabase
            .from("guest_list_entries")
            .select(`
                id,
                event_id,
                status
            `),
    ]);

    const error =
        guestsError ||
        reservationsError ||
        smsLogsError ||
        smsRepliesError ||
        eventsError ||
        formsError ||
        formSubmissionsError ||
        guestListEntriesError;

    if (error) {
        console.error("Dashboard loading error:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });

        return (
            <div className="flex min-h-screen bg-black text-white">
                <Sidebar />

                <main className="flex-1 p-6 sm:p-10">
                    <div className="rounded-xl border border-red-800 bg-red-950/40 p-5">
                        <h1 className="text-xl font-bold text-red-300">
                            Could not load dashboard
                        </h1>

                        <p className="mt-2 text-sm text-red-200">
                            {error.message}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    const guestList: Guest[] = guests ?? [];
    const reservationList: Reservation[] = reservations ?? [];
    const smsList: SmsLog[] = (smsLogs ?? []) as SmsLog[];
    const smsReplyList: SmsReply[] = (smsReplies ?? []) as SmsReply[];
    const eventList: EventRecord[] =
        (events ?? []) as EventRecord[];
    const formList: CampaignForm[] =
        (forms ?? []) as CampaignForm[];
    const submissionList: FormSubmission[] =
        (formSubmissions ?? []) as FormSubmission[];
    const guestListEntryList: GuestListEntry[] =
        (guestListEntries ?? []) as GuestListEntry[];

    const activeFormWithEvent =
        formList.find(
            (form) =>
                form.is_active &&
                form.event_id !== null
        ) ?? null;

    const activeEvent =
        eventList.find(
            (event) => event.is_active
        ) ??
        eventList.find(
            (event) =>
                event.id === activeFormWithEvent?.event_id
        ) ??
        null;

    const connectedForms = activeEvent
        ? formList.filter(
            (form) =>
                form.event_id === activeEvent.id &&
                form.is_active
        )
        : [];

    const connectedFormIds = new Set(
        connectedForms.map(
            (form) => form.id
        )
    );

    const activeEventSubmissions =
        submissionList.filter(
            (submission) =>
                connectedFormIds.has(
                    submission.form_id
                )
        );

    const activeEventEntries = activeEvent
        ? guestListEntryList.filter(
            (entry) =>
                entry.event_id === activeEvent.id
        )
        : [];

    const nonCancelledEntries =
        activeEventEntries.filter(
            (entry) =>
                entry.status !== "cancelled"
        );

    const checkedInEntries =
        nonCancelledEntries.filter(
            (entry) =>
                entry.status === "checked_in"
        );

    const remainingEntries =
        nonCancelledEntries.filter(
            (entry) =>
                entry.status !== "checked_in"
        );

    const attendanceRate = percentage(
        checkedInEntries.length,
        nonCancelledEntries.length
    );

    const noShowRate = percentage(
        remainingEntries.length,
        nonCancelledEntries.length
    );

    const totalGuests = guestList.length;

    const totalSms = smsList.length;

    const sentSms = smsList.filter(
        (sms) =>
            sms.status === "sent" ||
            sms.status === "delivered" ||
            sms.status === "queued" ||
            sms.status === "accepted" ||
            sms.status === "sending"
    ).length;

    const failedSms = smsList.filter(
        (sms) => sms.status === "failed" || sms.status === "undelivered"
    ).length;

    const recentSms = smsList.slice(0, 8);

    const { startDate: weekStartDate, endDate: weekEndDate } =
        getCurrentWeekRange();

    const yesRepliesThisWeek = smsReplyList.filter((reply) => {
        const replyDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Toronto",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date(reply.created_at));

        return (
            replyDate >= weekStartDate &&
            replyDate < weekEndDate &&
            isYesReply(reply.message)
        );
    });

    const maleGuests = guestList.filter(
        (guest) => guest.gender === "Male"
    ).length;

    const femaleGuests = guestList.filter(
        (guest) => guest.gender === "Female"
    ).length;

    const regularGuests = guestList.filter(
        (guest) => guest.vip_level === "Regular"
    ).length;

    const vipGuests = guestList.filter(
        (guest) => guest.vip_level === "VIP"
    ).length;

    const blackGuests = guestList.filter(
        (guest) => guest.vip_level === "BLACK"
    ).length;

    const influencerGuests = guestList.filter(
        (guest) => guest.tag === "Influencer"
    ).length;

    const birthdayGuests = guestList.filter(
        (guest) => guest.tag === "Birthday"
    ).length;

    const artistGuests = guestList.filter(
        (guest) => guest.tag === "Artist"
    ).length;

    const promoterGuests = guestList.filter(
        (guest) => guest.tag === "Promoter"
    ).length;

    const currentMonth = new Date().getMonth() + 1;

    const birthdaysThisMonth = guestList.filter((guest) => {
        if (!guest.birthday) return false;

        const birthdayMonth = Number(
            guest.birthday.split("-")[1]
        );

        return birthdayMonth === currentMonth;
    }).length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newGuestsThisWeek = guestList.filter((guest) => {
        return new Date(guest.created_at) >= sevenDaysAgo;
    }).length;

    const vipAndBlackTotal = vipGuests + blackGuests;

    const vipPercentage = percentage(
        vipAndBlackTotal,
        totalGuests
    );

    const malePercentage = percentage(
        maleGuests,
        totalGuests
    );

    const femalePercentage = percentage(
        femaleGuests,
        totalGuests
    );

    const today = new Date().toISOString().slice(0, 10);

    const activeEventReservations = activeEvent
        ? reservationList.filter(
            (reservation) =>
                reservation.event_id === activeEvent.id
        )
        : [];

    const activeEventDinnerReservations =
        activeEventReservations.filter(
            (reservation) =>
                reservation.reservation_type === "Dinner"
        );

    const activeEventConfirmedReservations =
        activeEventReservations.filter(
            (reservation) =>
                reservation.status === "Confirmed"
        );

    const activeEventReservedGuests =
        activeEventReservations
            .filter(
                (reservation) =>
                    reservation.status !== "Cancelled"
            )
            .reduce(
                (total, reservation) =>
                    total + Number(reservation.party_size || 0),
                0
            );

    const activeEventUpcomingReservations =
        activeEventReservations.filter(
            (reservation) =>
                reservation.reservation_date >= today &&
                reservation.status !== "Cancelled" &&
                reservation.status !== "Completed"
        );

    const dinnerReservationsToday = reservationList.filter(
        (reservation) =>
            reservation.reservation_date === today &&
            reservation.status !== "Cancelled"
    );

    const dinnerGuestsToday =
        dinnerReservationsToday.reduce(
            (total, reservation) =>
                total + Number(reservation.party_size || 0),
            0
        );

    const confirmedDinnerReservations =
        reservationList.filter(
            (reservation) =>
                reservation.status === "Confirmed"
        ).length;

    const upcomingDinnerReservations =
        reservationList.filter(
            (reservation) =>
                reservation.reservation_date >= today &&
                reservation.status !== "Cancelled" &&
                reservation.status !== "Completed"
        ).length;

    const cards = [
        {
            title: "Connected Forms",
            value: connectedForms.length,
            description: activeEvent
                ? "Forms connected to the active event"
                : "No active event selected",
        },
        {
            title: "Event Submissions",
            value: activeEventSubmissions.length,
            description: activeEvent
                ? "Submissions from connected forms"
                : "No active event selected",
        },
        {
            title: "Checked In",
            value: checkedInEntries.length,
            description: `${attendanceRate}% attendance rate`,
        },
        {
            title: "Remaining / No-Shows",
            value: remainingEntries.length,
            description: `${noShowRate}% no-show rate`,
        },
        {
            title: "Total Guests",
            value: totalGuests,
            description: "All contacts in your CRM",
        },
        {
            title: "Male Guests",
            value: maleGuests,
            description: `${malePercentage}% of your guests`,
        },
        {
            title: "Female Guests",
            value: femaleGuests,
            description: `${femalePercentage}% of your guests`,
        },
        {
            title: "VIP Members",
            value: vipAndBlackTotal,
            description: `${vipPercentage}% VIP or BLACK`,
        },
        {
            title: "Birthdays This Month",
            value: birthdaysThisMonth,
            description: "Guests to contact this month",
        },
        {
            title: "New This Week",
            value: newGuestsThisWeek,
            description: "Added during the last 7 days",
        },
        {
            title: "YES Replies This Week",
            value: yesRepliesThisWeek.length,
            description: "Inbound confirmations received since Monday",
        },
        {
            title: "SMS Logged",
            value: totalSms,
            description: `${sentSms} successful · ${failedSms} failed`,
        },
    ];

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="min-h-screen flex-1 p-6 sm:p-10">
                <div className="mx-auto max-w-7xl">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
                            Ora CRM
                        </p>

                        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                            Dashboard
                        </h1>

                        <p className="mt-2 text-sm text-zinc-400">
                            Guest list performance and audience statistics.
                        </p>
                    </div>

                    <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {cards.map((card) => (
                            <div
                                key={card.title}
                                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                            >
                                <p className="text-sm text-zinc-400">
                                    {card.title}
                                </p>

                                <p className="mt-3 text-4xl font-bold">
                                    {card.value}
                                </p>

                                <p className="mt-3 text-sm text-zinc-500">
                                    {card.description}
                                </p>
                            </div>
                        ))}
                    </section>

                    <section className="mt-10 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                                    Active Event Workflow
                                </p>

                                <h2 className="mt-2 text-2xl font-bold">
                                    {activeEvent
                                        ? activeEvent.name
                                        : "No active event"}
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    {activeEvent
                                        ? `${activeEvent.venue || "Venue not set"} · ${new Date(
                                            `${activeEvent.event_date}T12:00:00`
                                        ).toLocaleDateString("en-CA", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}`
                                        : "Create or activate an event to connect forms and track attendance."}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/events"
                                    className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
                                >
                                    Manage Events
                                </Link>

                                <Link
                                    href="/forms"
                                    className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5"
                                >
                                    Campaign Forms
                                </Link>

                                <Link
                                    href="/host/check-in"
                                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                                >
                                    Check-In & No-Shows
                                </Link>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <SmallStat
                                label="Connected Forms"
                                value={connectedForms.length}
                            />

                            <SmallStat
                                label="Submissions"
                                value={activeEventSubmissions.length}
                            />

                            <SmallStat
                                label="Guest List"
                                value={nonCancelledEntries.length}
                            />

                            <SmallStat
                                label="Checked In"
                                value={checkedInEntries.length}
                            />

                            <SmallStat
                                label="Remaining"
                                value={remainingEntries.length}
                            />
                        </div>
                    </section>

                    <section className="mt-10 grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                            <h2 className="text-xl font-bold">
                                Membership Breakdown
                            </h2>

                            <div className="mt-6 space-y-5">
                                <StatRow
                                    label="Regular"
                                    value={regularGuests}
                                    total={totalGuests}
                                />

                                <StatRow
                                    label="VIP"
                                    value={vipGuests}
                                    total={totalGuests}
                                />

                                <StatRow
                                    label="BLACK"
                                    value={blackGuests}
                                    total={totalGuests}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                            <h2 className="text-xl font-bold">
                                Guest Categories
                            </h2>

                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <SmallStat
                                    label="Influencers"
                                    value={influencerGuests}
                                />

                                <SmallStat
                                    label="Birthday Tags"
                                    value={birthdayGuests}
                                />

                                <SmallStat
                                    label="Artists"
                                    value={artistGuests}
                                />

                                <SmallStat
                                    label="Promoters"
                                    value={promoterGuests}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <div>
                            <h2 className="text-xl font-bold">
                                SMS Audience Preview
                            </h2>

                            <p className="mt-2 text-sm text-zinc-400">
                                These same categories can be used to filter
                                your SMS campaigns.
                            </p>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <SmallStat
                                label="All Guests"
                                value={totalGuests}
                            />

                            <SmallStat
                                label="Male"
                                value={maleGuests}
                            />

                            <SmallStat
                                label="Female"
                                value={femaleGuests}
                            />

                            <SmallStat
                                label="VIP + BLACK"
                                value={vipAndBlackTotal}
                            />
                        </div>
                    </section>

                    <section className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                                    Weekly Confirmations
                                </p>

                                <h2 className="mt-2 text-xl font-bold">
                                    YES Replies This Week
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    Incoming YES confirmations received from Monday through Sunday.
                                </p>
                            </div>

                            <div className="rounded-xl border border-emerald-500/20 bg-black px-5 py-4 text-center">
                                <p className="text-3xl font-bold text-emerald-300">
                                    {yesRepliesThisWeek.length}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    confirmed replies
                                </p>
                            </div>
                        </div>

                        {yesRepliesThisWeek.length > 0 ? (
                            <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
                                {yesRepliesThisWeek.map((reply) => (
                                    <article
                                        key={reply.id}
                                        className="flex flex-col gap-3 border-b border-zinc-800 bg-black p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold text-white">
                                                {reply.guest_name || reply.phone || "Unknown guest"}
                                            </p>

                                            <p className="mt-1 text-sm text-emerald-300">
                                                {reply.message || "YES"}
                                            </p>

                                            {reply.guest_name && reply.phone && (
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {reply.phone}
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-xs text-zinc-500">
                                            {formatDateTime(reply.created_at)}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                                No YES replies have been received this week.
                            </p>
                        )}
                    </section>

                    <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold">
                                    Recent SMS Activity
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    Latest messages recorded in your SMS log.
                                </p>
                            </div>

                            <Link
                                href="/sms"
                                className="rounded-lg border border-zinc-700 px-4 py-2 text-center text-sm font-medium transition hover:bg-zinc-900"
                            >
                                Open SMS Center
                            </Link>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                            <SmallStat
                                label="Total Logged"
                                value={totalSms}
                            />

                            <SmallStat
                                label="Successful"
                                value={sentSms}
                            />

                            <SmallStat
                                label="Failed"
                                value={failedSms}
                            />
                        </div>

                        {recentSms.length > 0 ? (
                            <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
                                {recentSms.map((sms) => (
                                    <article
                                        key={sms.id}
                                        className="border-b border-zinc-800 bg-black p-4 last:border-b-0"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-semibold">
                                                    {sms.campaign || "Direct SMS"}
                                                </p>

                                                <p className="mt-1 text-sm text-zinc-400">
                                                    {sms.phone || "No phone number"}
                                                    {sms.audience
                                                        ? ` · ${sms.audience}`
                                                        : ""}
                                                </p>
                                            </div>

                                            <span
                                                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${sms.status === "failed"
                                                    ? "bg-red-950 text-red-400"
                                                    : "bg-green-950 text-green-400"
                                                    }`}
                                            >
                                                {sms.status || "unknown"}
                                            </span>
                                        </div>

                                        <p className="mt-3 line-clamp-2 text-sm text-zinc-300">
                                            {sms.message || "No message content."}
                                        </p>

                                        <p className="mt-3 text-xs text-zinc-500">
                                            {formatDateTime(sms.created_at)}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-6 text-sm text-zinc-500">
                                No SMS messages have been logged yet.
                            </p>
                        )}
                    </section>

                    <section className="mt-10 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                                    Reservation Manager
                                </p>

                                <h2 className="mt-2 text-2xl font-bold">
                                    {activeEvent
                                        ? `${activeEvent.name} Reservations`
                                        : "Event Reservations"}
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    {activeEvent
                                        ? `Reservations connected to ${activeEvent.name}.`
                                        : "Activate an event to organize reservations by event."}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/reservations"
                                    className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
                                >
                                    Add Reservation
                                </Link>

                                <Link
                                    href="/events"
                                    className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5"
                                >
                                    Select Event
                                </Link>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <SmallStat
                                label="Event Reservations"
                                value={activeEventReservations.length}
                            />

                            <SmallStat
                                label="Dinner Reservations"
                                value={activeEventDinnerReservations.length}
                            />

                            <SmallStat
                                label="Confirmed"
                                value={activeEventConfirmedReservations.length}
                            />

                            <SmallStat
                                label="Reserved Guests"
                                value={activeEventReservedGuests}
                            />
                        </div>

                        <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-300">
                                        Upcoming reservations
                                    </p>

                                    <p className="mt-1 text-sm text-zinc-500">
                                        {activeEventUpcomingReservations.length} upcoming for the active event
                                    </p>
                                </div>

                                <Link
                                    href="/reservations"
                                    className="text-sm font-semibold text-violet-300 transition hover:text-violet-200"
                                >
                                    Open manager →
                                </Link>
                            </div>
                        </div>
                    </section>

                    <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold">
                                    Dinner Reservations
                                </h2>

                                <p className="mt-2 text-sm text-zinc-400">
                                    General dinner reservation activity.
                                </p>
                            </div>

                            <Link
                                href="/reservations"
                                className="rounded-lg border border-zinc-700 px-4 py-2 text-center text-sm font-medium transition hover:bg-zinc-900"
                            >
                                Manage Reservations
                            </Link>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <SmallStat
                                label="Dinner Reservations Today"
                                value={dinnerReservationsToday.length}
                            />

                            <SmallStat
                                label="Dinner Guests Today"
                                value={dinnerGuestsToday}
                            />

                            <SmallStat
                                label="Confirmed Dinners"
                                value={confirmedDinnerReservations}
                            />

                            <SmallStat
                                label="Upcoming Dinners"
                                value={upcomingDinnerReservations}
                            />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

type StatRowProps = {
    label: string;
    value: number;
    total: number;
};

function StatRow({
    label,
    value,
    total,
}: StatRowProps) {
    const width = percentage(value, total);

    return (
        <div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">
                    {label}
                </span>

                <span className="text-zinc-500">
                    {value} · {width}%
                </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                        width: `${width}%`,
                    }}
                />
            </div>
        </div>
    );
}

type SmallStatProps = {
    label: string;
    value: number;
};

function SmallStat({
    label,
    value,
}: SmallStatProps) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-black p-5">
            <p className="text-sm text-zinc-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold">
                {value}
            </p>
        </div>
    );
}
