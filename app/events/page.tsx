import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

type EventRecord = {
  id: number;
  name: string;
  venue: string | null;
  address: string | null;
  event_date: string;
  dinner_time: string | null;
  club_time: string | null;
  host_name: string | null;
  is_active: boolean;
};

type CampaignForm = {
  id: number;
  event_id: number | null;
};

type GuestListEntry = {
  id: number;
  event_id: number;
  status: string;
};

function createSupabaseClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
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

async function setEventActive(formData: FormData) {
  "use server";

  const eventId = Number(
    formData.get("event_id")
  );

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0
  ) {
    redirect(
      "/events?error=Invalid%20event"
    );
  }

  const cookieStore = await cookies();
  const supabase =
    createSupabaseClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/events");
  }

  const { error: deactivateError } =
    await supabase
      .from("events")
      .update({
        is_active: false,
      })
      .neq("id", eventId);

  if (deactivateError) {
    redirect(
      `/events?error=${encodeURIComponent(
        deactivateError.message
      )}`
    );
  }

  const { error: activateError } =
    await supabase
      .from("events")
      .update({
        is_active: true,
      })
      .eq("id", eventId);

  if (activateError) {
    redirect(
      `/events?error=${encodeURIComponent(
        activateError.message
      )}`
    );
  }

  redirect(
    "/events?success=Event%20activated"
  );
}

async function deactivateEvent(
  formData: FormData
) {
  "use server";

  const eventId = Number(
    formData.get("event_id")
  );

  if (
    !Number.isInteger(eventId) ||
    eventId <= 0
  ) {
    redirect(
      "/events?error=Invalid%20event"
    );
  }

  const cookieStore = await cookies();
  const supabase =
    createSupabaseClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/events");
  }

  const { error } = await supabase
    .from("events")
    .update({
      is_active: false,
    })
    .eq("id", eventId);

  if (error) {
    redirect(
      `/events?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect(
    "/events?success=Event%20deactivated"
  );
}

type EventsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EventsPage({
  searchParams,
}: EventsPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const supabase =
    createSupabaseClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/events");
  }

  const [
    { data: events, error: eventsError },
    { data: forms, error: formsError },
    {
      data: guestListEntries,
      error: guestListError,
    },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(`
                id,
                name,
                venue,
                address,
                event_date,
                dinner_time,
                club_time,
                host_name,
                is_active
            `)
      .order("event_date", {
        ascending: false,
      }),

    supabase
      .from("forms")
      .select("id,event_id"),

    supabase
      .from("guest_list_entries")
      .select("id,event_id,status"),
  ]);

  const loadError =
    eventsError ||
    formsError ||
    guestListError;

  const eventList =
    (events ?? []) as EventRecord[];

  const formList =
    (forms ?? []) as CampaignForm[];

  const entryList =
    (guestListEntries ??
      []) as GuestListEntry[];

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const activeEvents = eventList.filter(
    (event) => event.is_active
  );

  const upcomingEvents = eventList.filter(
    (event) =>
      !event.is_active &&
      event.event_date >= today
  );

  const pastEvents = eventList.filter(
    (event) =>
      !event.is_active &&
      event.event_date < today
  );

  function getEventStats(eventId: number) {
    const connectedForms =
      formList.filter(
        (form) =>
          form.event_id === eventId
      ).length;

    const entries = entryList.filter(
      (entry) =>
        entry.event_id === eventId &&
        entry.status !== "cancelled"
    );

    const checkedIn = entries.filter(
      (entry) =>
        entry.status === "checked_in"
    ).length;

    return {
      connectedForms,
      guestList: entries.length,
      checkedIn,
      remaining:
        entries.length - checkedIn,
    };
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-500">
                Ora CRM
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Events
              </h1>

              <p className="mt-2 max-w-2xl text-zinc-400">
                Create, review, activate, and manage every event.
              </p>
            </div>

            <Link
              href="/events/new"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              Create Event
            </Link>
          </div>

          {params.error ? (
            <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
              {decodeURIComponent(
                params.error
              )}
            </div>
          ) : null}

          {params.success ? (
            <div className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
              {decodeURIComponent(
                params.success
              )}
            </div>
          ) : null}

          {loadError ? (
            <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/40 p-6">
              <h2 className="text-xl font-bold text-red-200">
                Events could not be loaded
              </h2>

              <p className="mt-2 text-sm text-red-300">
                {loadError.message}
              </p>
            </div>
          ) : eventList.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-12 text-center">
              <div className="text-4xl">
                📅
              </div>

              <h2 className="mt-4 text-2xl font-bold">
                No events created yet
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-zinc-400">
                Create your first event, then connect campaign forms to it.
              </p>

              <Link
                href="/events/new"
                className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200"
              >
                Create First Event
              </Link>
            </div>
          ) : (
            <div className="mt-10 space-y-10">
              <EventSection
                title="Active Event"
                description="The event currently used by the dashboard and check-in workflow."
                events={activeEvents}
                emptyMessage="No event is currently active."
                getEventStats={getEventStats}
              />

              <EventSection
                title="Upcoming Events"
                description="Future events that are not currently active."
                events={upcomingEvents}
                emptyMessage="No upcoming inactive events."
                getEventStats={getEventStats}
              />

              <EventSection
                title="Past Events"
                description="Previous events remain available for reporting and review."
                events={pastEvents}
                emptyMessage="No past events."
                getEventStats={getEventStats}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

type EventStats = {
  connectedForms: number;
  guestList: number;
  checkedIn: number;
  remaining: number;
};

function EventSection({
  title,
  description,
  events,
  emptyMessage,
  getEventStats,
}: {
  title: string;
  description: string;
  events: EventRecord[];
  emptyMessage: string;
  getEventStats: (
    eventId: number
  ) => EventStats;
}) {
  return (
    <section>
      <div>
        <h2 className="text-2xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          {description}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-6 text-sm text-zinc-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              stats={getEventStats(
                event.id
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({
  event,
  stats,
}: {
  event: EventRecord;
  stats: EventStats;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${event.is_active
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-zinc-800 text-zinc-400"
                }`}
            >
              {event.is_active
                ? "Active"
                : "Inactive"}
            </span>

            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              {new Date(
                `${event.event_date}T12:00:00`
              ).toLocaleDateString(
                "en-CA",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              )}
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-bold">
            {event.name}
          </h3>

          <p className="mt-2 text-sm text-zinc-400">
            {event.venue ||
              "Venue not set"}
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            {event.address ||
              "Address not set"}
          </p>

          <p className="mt-2 text-xs text-zinc-500">
            Dinner:{" "}
            {event.dinner_time ||
              "Not set"}{" "}
            · Celebration:{" "}
            {event.club_time ||
              "Not set"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat
            label="Forms"
            value={
              stats.connectedForms
            }
          />

          <Stat
            label="Guest List"
            value={stats.guestList}
          />

          <Stat
            label="Checked In"
            value={stats.checkedIn}
          />

          <Stat
            label="Remaining"
            value={stats.remaining}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/events/${event.id}`}
          className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          View
        </Link>

        <Link
          href={`/events/${event.id}/edit`}
          className="rounded-lg bg-zinc-800 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-zinc-700"
        >
          Edit
        </Link>

        <Link
          href={`/forms?event=${event.id}`}
          className="rounded-lg bg-zinc-800 px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-zinc-700"
        >
          Forms
        </Link>

        <Link
          href={`/host/check-in?event=${event.id}`}
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          Check-In
        </Link>
      </div>

      <div className="mt-3">
        {event.is_active ? (
          <form
            action={deactivateEvent}
          >
            <input
              type="hidden"
              name="event_id"
              value={event.id}
            />

            <button
              type="submit"
              className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
            >
              Deactivate Event
            </button>
          </form>
        ) : (
          <form
            action={setEventActive}
          >
            <input
              type="hidden"
              name="event_id"
              value={event.id}
            />

            <button
              type="submit"
              className="w-full rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
            >
              Set as Active Event
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-24 rounded-xl bg-black p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}
