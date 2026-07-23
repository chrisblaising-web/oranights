import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

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
    }).format(new Date(date));
}

export default async function DashboardPage() {
    const [
        { data: guests, error: guestsError },
        { data: reservations, error: reservationsError },
        { data: smsLogs, error: smsLogsError },
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
    ]);

    const error =
        guestsError ||
        reservationsError ||
        smsLogsError;

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
