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

type GuestListEntry = {
    id: number;
    event_id: number;
    guest_id: number | null;
    phone: string;
    status: string;
    guests: GuestRelation;
};

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

function getGuest(
    relation: GuestRelation
) {
    if (!relation) {
        return null;
    }

    if (Array.isArray(relation)) {
        return relation[0] ?? null;
    }

    return relation;
}

function cleanName(value: unknown) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, 100);
}

function cleanLastFour(value: unknown) {
    if (typeof value !== "string") {
        return "";
    }

    return value.replace(/\D/g, "").slice(-4);
}

export async function POST(
    request: NextRequest
) {
    try {
        const supabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL;

        const supabaseAnonKey =
            process.env
                .NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

        /*
         * This client only verifies the logged-in
         * Supabase user.
         */
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

        if (
            userError ||
            !userData.user
        ) {
            return NextResponse.json(
                {
                    error:
                        "Your session is invalid or expired. Please sign in again.",
                },
                {
                    status: 401,
                }
            );
        }

        /*
         * This server-only client can check roles
         * and search guest data securely.
         *
         * The service role key is never returned
         * to the browser.
         */
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
            .select(
                "role, is_active, display_name"
            )
            .eq("id", userData.user.id)
            .maybeSingle();

        if (profileError) {
            console.error(
                "Host profile error:",
                profileError
            );

            return NextResponse.json(
                {
                    error:
                        "Your account permissions could not be verified.",
                },
                {
                    status: 500,
                }
            );
        }

        if (!profile) {
            return NextResponse.json(
                {
                    error:
                        "Your account does not have an assigned role.",
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
            profile.role !== "host" &&
            profile.role !== "admin"
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

        const body = await request.json();

        const name =
            cleanName(body?.name);

        const lastFour =
            cleanLastFour(body?.lastFour);

        if (name.length < 2) {
            return NextResponse.json(
                {
                    error:
                        "Enter at least 2 letters of the guest name.",
                },
                {
                    status: 400,
                }
            );
        }

        if (lastFour.length !== 4) {
            return NextResponse.json(
                {
                    error:
                        "Enter exactly the last 4 phone digits.",
                },
                {
                    status: 400,
                }
            );
        }

        /*
         * Find the active event.
         *
         * The newest active event is selected.
         */
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
                "Active event lookup error:",
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

        /*
         * Search only inside the active event.
         *
         * guests!inner allows filtering by the
         * related guest name.
         */
        const {
            data: entries,
            error: entriesError,
        } = await adminClient
            .from("guest_list_entries")
            .select(
                `
          id,
          event_id,
          guest_id,
          phone,
          status,
          guests!inner (
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
            .ilike(
                "guests.name",
                `%${name}%`
            )
            .like(
                "phone",
                `%${lastFour}`
            )
            .neq(
                "status",
                "cancelled"
            )
            .limit(10);

        if (entriesError) {
            console.error(
                "Host guest search error:",
                entriesError
            );

            return NextResponse.json(
                {
                    error:
                        "The guest search could not be completed.",
                },
                {
                    status: 500,
                }
            );
        }

        const safeResults = (
            (entries ?? []) as GuestListEntry[]
        ).map((entry) => {
            const guest =
                getGuest(entry.guests);

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
                status: entry.status,
                checkedIn:
                    entry.status ===
                    "checked_in",
            };
        });

        return NextResponse.json({
            event: {
                id: activeEvent.id,
                name: activeEvent.name,
                venue: activeEvent.venue,
                eventDate:
                    activeEvent.event_date,
            },
            guests: safeResults,
        });
    } catch (error) {
        console.error(
            "Unexpected host search error:",
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