import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type GuestRow = {
    id: number;
    name: string | null;
    phone: string | null;
    vip_level: string | null;
    tag: string | null;
};

type GuestRelation = GuestRow | GuestRow[] | null;

type GuestListEntry = {
    id: number;
    event_id: number;
    guest_id: number | null;
    phone: string;
    status: string;
    guests: GuestRelation;
};

type ReservationRow = {
    id: number;
    event_id: number | null;
    guest_id: number | null;
    reservation_type: string | null;
    reservation_time: string | null;
    party_size: number | null;
    table_number: string | null;
    status: string | null;
    guests: GuestRelation;
};

function getBearerToken(request: NextRequest) {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    return authorization.slice(7).trim();
}

function getGuest(relation: GuestRelation) {
    if (!relation) return null;
    return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function cleanName(value: unknown) {
    return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

function cleanLastFour(value: unknown) {
    return typeof value === "string"
        ? value.replace(/\D/g, "").slice(-4)
        : "";
}

function phoneLastFour(value: string | null | undefined) {
    return String(value || "").replace(/\D/g, "").slice(-4);
}

export async function POST(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
            return NextResponse.json(
                { error: "Missing Supabase server configuration." },
                { status: 500 }
            );
        }

        const accessToken = getBearerToken(request);
        if (!accessToken) {
            return NextResponse.json(
                { error: "Authentication is required." },
                { status: 401 }
            );
        }

        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userError } =
            await authClient.auth.getUser(accessToken);

        if (userError || !userData.user) {
            return NextResponse.json(
                { error: "Your session is invalid or expired. Please sign in again." },
                { status: 401 }
            );
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: profile, error: profileError } = await adminClient
            .from("user_profiles")
            .select("role, is_active")
            .eq("id", userData.user.id)
            .maybeSingle();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: "Your account permissions could not be verified." },
                { status: 403 }
            );
        }

        if (!profile.is_active) {
            return NextResponse.json(
                { error: "Your account has been disabled." },
                { status: 403 }
            );
        }

        if (profile.role !== "host" && profile.role !== "admin") {
            return NextResponse.json(
                { error: "You do not have access to the host portal." },
                { status: 403 }
            );
        }

        const body = await request.json();
        const name = cleanName(body?.name);
        const lastFour = cleanLastFour(body?.lastFour);

        if (name.length < 2) {
            return NextResponse.json(
                { error: "Enter at least 2 letters of the guest name." },
                { status: 400 }
            );
        }

        if (lastFour.length !== 4) {
            return NextResponse.json(
                { error: "Enter exactly the last 4 phone digits." },
                { status: 400 }
            );
        }

        const { data: activeEvent, error: eventError } = await adminClient
            .from("events")
            .select("id, name, venue, event_date")
            .eq("is_active", true)
            .order("event_date", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (eventError) {
            return NextResponse.json(
                { error: "The active event could not be loaded." },
                { status: 500 }
            );
        }

        if (!activeEvent) {
            return NextResponse.json(
                { error: "There is no active event." },
                { status: 404 }
            );
        }

        const { data: rawEntries, error: entriesError } = await adminClient
            .from("guest_list_entries")
            .select(`
                id,
                event_id,
                guest_id,
                phone,
                status,
                guests!inner (
                    id,
                    name,
                    phone,
                    vip_level,
                    tag
                )
            `)
            .eq("event_id", activeEvent.id)
            .ilike("guests.name", `%${name}%`)
            .neq("status", "cancelled")
            .limit(100);

        const entries = ((rawEntries ?? []) as GuestListEntry[]).filter(
            (entry) => {
                const guest = getGuest(entry.guests);

                const entryPhoneMatches =
                    phoneLastFour(entry.phone) === lastFour;

                const guestPhoneMatches =
                    phoneLastFour(guest?.phone) === lastFour;

                return entryPhoneMatches || guestPhoneMatches;
            }
        );

        if (entriesError) {
            console.error("Host guest-list search error:", entriesError);
            return NextResponse.json(
                { error: "The guest-list search could not be completed." },
                { status: 500 }
            );
        }

        const { data: reservations, error: reservationsError } =
            await adminClient
                .from("reservations")
                .select(`
                    id,
                    event_id,
                    guest_id,
                    reservation_type,
                    reservation_time,
                    party_size,
                    table_number,
                    status,
                    guests (
                        id,
                        name,
                        phone,
                        vip_level,
                        tag
                    )
                `)
                .eq("event_id", activeEvent.id)
                .neq("status", "Cancelled")
                .limit(1000);

        if (reservationsError) {
            console.error("Host reservation search error:", reservationsError);
            return NextResponse.json(
                { error: "Reservations could not be searched." },
                { status: 500 }
            );
        }

        const guestListResults = ((entries ?? []) as GuestListEntry[]).map(
            (entry) => {
                const guest = getGuest(entry.guests);
                return {
                    entryId: entry.id,
                    reservationId: null,
                    source: "guest_list" as const,
                    name: guest?.name || "Unknown guest",
                    phoneLast4: lastFour,
                    vipLevel: guest?.vip_level || "Regular",
                    tag: guest?.tag || "Regular",
                    status: entry.status,
                    checkedIn: entry.status === "checked_in",
                    reservationType: null,
                    partySize: null,
                    reservationTime: null,
                    tableNumber: null,
                };
            }
        );

        const reservationResults = ((reservations ?? []) as ReservationRow[])
            .filter((reservation) => {
                const guest = getGuest(reservation.guests);
                const guestName = String(guest?.name || "").toLowerCase();
                return (
                    guestName.includes(name.toLowerCase()) &&
                    phoneLastFour(guest?.phone) === lastFour
                );
            })
            .map((reservation) => {
                const guest = getGuest(reservation.guests);
                const matchingEntry = ((entries ?? []) as GuestListEntry[]).find(
                    (entry) =>
                        entry.guest_id === reservation.guest_id &&
                        entry.event_id === reservation.event_id
                );

                return {
                    entryId: matchingEntry?.id ?? null,
                    reservationId: reservation.id,
                    source: "reservation" as const,
                    name: guest?.name || "Unknown guest",
                    phoneLast4: lastFour,
                    vipLevel: guest?.vip_level || "Regular",
                    tag: guest?.tag || "Regular",
                    status: matchingEntry?.status || reservation.status || "Pending",
                    checkedIn: matchingEntry?.status === "checked_in",
                    reservationType: reservation.reservation_type || "Reservation",
                    partySize: reservation.party_size || 1,
                    reservationTime: reservation.reservation_time,
                    tableNumber: reservation.table_number,
                };
            });

        const merged = new Map<string, (typeof guestListResults)[number] | (typeof reservationResults)[number]>();

        for (const result of guestListResults) {
            merged.set(`guest:${result.entryId}`, result);
        }

        for (const result of reservationResults) {
            const sameGuestList = result.entryId
                ? merged.get(`guest:${result.entryId}`)
                : null;

            if (sameGuestList) {
                merged.set(`guest:${result.entryId}`, {
                    ...sameGuestList,
                    reservationId: result.reservationId,
                    source: "reservation",
                    reservationType: result.reservationType,
                    partySize: result.partySize,
                    reservationTime: result.reservationTime,
                    tableNumber: result.tableNumber,
                });
            } else {
                merged.set(`reservation:${result.reservationId}`, result);
            }
        }

        return NextResponse.json({
            event: {
                id: activeEvent.id,
                name: activeEvent.name,
                venue: activeEvent.venue,
                eventDate: activeEvent.event_date,
            },
            guests: Array.from(merged.values()).slice(0, 10),
        });
    } catch (error) {
        console.error("Unexpected host search error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unexpected server error.",
            },
            { status: 500 }
        );
    }
}
