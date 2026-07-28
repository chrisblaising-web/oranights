import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type GuestRelation =
    | {
        name: string | null;
        vip_level: string | null;
        tag: string | null;
    }
    | {
        name: string | null;
        vip_level: string | null;
        tag: string | null;
    }[]
    | null;

function getBearerToken(request: NextRequest) {
    const authorization =
        request.headers.get("authorization");

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {
        return null;
    }

    return authorization.slice(7).trim();
}

function getGuest(relation: GuestRelation) {
    if (!relation) {
        return null;
    }

    return Array.isArray(relation)
        ? relation[0] ?? null
        : relation;
}

export async function GET(request: NextRequest) {
    try {
        const supabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL;

        const supabaseAnonKey =
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (
            !supabaseUrl ||
            !supabaseAnonKey ||
            !serviceRoleKey
        ) {
            return NextResponse.json(
                {
                    error:
                        "Missing Supabase server configuration.",
                },
                {
                    status: 500,
                }
            );
        }

        const accessToken =
            getBearerToken(request);

        if (!accessToken) {
            return NextResponse.json(
                {
                    error:
                        "Authentication is required.",
                },
                {
                    status: 401,
                }
            );
        }

        const authClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );

        const {
            data: userData,
            error: userError,
        } = await authClient.auth.getUser(
            accessToken
        );

        if (userError || !userData.user) {
            return NextResponse.json(
                {
                    error:
                        "Your session is invalid or expired.",
                },
                {
                    status: 401,
                }
            );
        }

        const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );

        const {
            data: profile,
            error: profileError,
        } = await adminClient
            .from("user_profiles")
            .select("role, is_active")
            .eq("id", userData.user.id)
            .maybeSingle();

        if (profileError || !profile) {
            return NextResponse.json(
                {
                    error:
                        "Your account permissions could not be verified.",
                },
                {
                    status: 403,
                }
            );
        }

        if (!profile.is_active) {
            return NextResponse.json(
                {
                    error:
                        "Your account has been disabled.",
                },
                {
                    status: 403,
                }
            );
        }

        if (
            profile.role !== "admin" &&
            profile.role !== "host"
        ) {
            return NextResponse.json(
                {
                    error:
                        "You do not have access to the host portal.",
                },
                {
                    status: 403,
                }
            );
        }

        const {
            data: activeEvent,
            error: eventError,
        } = await adminClient
            .from("events")
            .select(
                "id, name, venue, event_date"
            )
            .eq("is_active", true)
            .order("event_date", {
                ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (eventError) {
            console.error(
                "Active event status error:",
                eventError
            );

            return NextResponse.json(
                {
                    error:
                        "The active event could not be loaded.",
                },
                {
                    status: 500,
                }
            );
        }

        if (!activeEvent) {
            return NextResponse.json(
                {
                    error:
                        "There is no active event.",
                },
                {
                    status: 404,
                }
            );
        }

        const {
            data: entries,
            error: entriesError,
        } = await adminClient
            .from("guest_list_entries")
            .select(
                `
                    id,
                    status,
                    created_at,
                    guests (
                        name,
                        vip_level,
                        tag
                    )
                `
            )
            .eq(
                "event_id",
                activeEvent.id
            )
            .neq(
                "status",
                "cancelled"
            )
            .order(
                "created_at",
                {
                    ascending: false,
                }
            );

        if (entriesError) {
            console.error(
                "Event guest status error:",
                entriesError
            );

            return NextResponse.json(
                {
                    error:
                        "The event guest list could not be loaded.",
                },
                {
                    status: 500,
                }
            );
        }

        const safeEntries =
            entries ?? [];

        const checkedInEntries =
            safeEntries.filter(
                (entry) =>
                    entry.status ===
                    "checked_in"
            );

        const remainingEntries =
            safeEntries.filter(
                (entry) =>
                    entry.status !==
                    "checked_in"
            );

        const checkedInGuests =
            checkedInEntries.map(
                (entry) => {
                    const guest =
                        getGuest(
                            entry.guests as GuestRelation
                        );

                    return {
                        entryId: entry.id,
                        name:
                            guest?.name ||
                            "Unknown guest",
                        vipLevel:
                            guest?.vip_level ||
                            "Regular",
                        tag:
                            guest?.tag ||
                            "Regular",
                        status:
                            entry.status,
                    };
                }
            );

        /*
         * Remaining guest names are private.
         * Only administrators receive this list.
         */
        const remainingGuests =
            profile.role === "admin"
                ? remainingEntries.map(
                    (entry) => {
                        const guest =
                            getGuest(
                                entry.guests as GuestRelation
                            );

                        return {
                            entryId:
                                entry.id,
                            name:
                                guest?.name ||
                                "Unknown guest",
                            vipLevel:
                                guest?.vip_level ||
                                "Regular",
                            tag:
                                guest?.tag ||
                                "Regular",
                            status:
                                entry.status,
                        };
                    }
                )
                : [];

        const totalGuests =
            safeEntries.length;

        const checkedIn =
            checkedInEntries.length;

        const remaining =
            remainingEntries.length;

        const attendanceRate =
            totalGuests > 0
                ? Math.round(
                    (checkedIn /
                        totalGuests) *
                    100
                )
                : 0;

        const noShowRate =
            totalGuests > 0
                ? Math.round(
                    (remaining /
                        totalGuests) *
                    100
                )
                : 0;

        return NextResponse.json({
            viewerRole:
                profile.role,

            event: {
                id: activeEvent.id,
                name: activeEvent.name,
                venue:
                    activeEvent.venue,
                eventDate:
                    activeEvent.event_date,
            },

            stats: {
                totalGuests,
                checkedIn,
                remaining,
                attendanceRate,
                noShowRate,
            },

            checkedInGuests,
            remainingGuests,
        });
    } catch (error) {
        console.error(
            "Unexpected event-status error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unexpected server error.",
            },
            {
                status: 500,
            }
        );
    }
}