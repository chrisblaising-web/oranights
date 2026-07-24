import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CheckAction = "check_in" | "check_out";

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

function cleanEntryId(value: unknown) {
    const entryId = Number(value);

    if (
        !Number.isInteger(entryId) ||
        entryId <= 0
    ) {
        return null;
    }

    return entryId;
}

function cleanAction(
    value: unknown
): CheckAction | null {
    if (
        value === "check_in" ||
        value === "check_out"
    ) {
        return value;
    }

    return null;
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
         * Verify the currently logged-in user.
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
         * Server-only Supabase client.
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
                "Host permission error:",
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
                        "You do not have access to guest check-in.",
                },
                {
                    status: 403,
                }
            );
        }

        const body =
            await request.json();

        const entryId =
            cleanEntryId(body?.entryId);

        /*
         * Older page versions may not send action yet.
         * Defaulting to check_in keeps current behavior working.
         */
        const action =
            cleanAction(body?.action) ??
            "check_in";

        if (!entryId) {
            return NextResponse.json(
                {
                    error:
                        "A valid guest-list entry is required.",
                },
                {
                    status: 400,
                }
            );
        }

        const {
            data: entry,
            error: entryError,
        } = await adminClient
            .from("guest_list_entries")
            .select(
                `
                    id,
                    event_id,
                    status,
                    events (
                        id,
                        name,
                        is_active
                    ),
                    guests (
                        name
                    )
                `
            )
            .eq("id", entryId)
            .maybeSingle();

        if (entryError) {
            console.error(
                "Guest-list entry lookup error:",
                entryError
            );

            return NextResponse.json(
                {
                    error:
                        "The guest-list entry could not be loaded.",
                },
                {
                    status: 500,
                }
            );
        }

        if (!entry) {
            return NextResponse.json(
                {
                    error:
                        "This guest-list entry does not exist.",
                },
                {
                    status: 404,
                }
            );
        }

        const eventRelation =
            Array.isArray(entry.events)
                ? entry.events[0]
                : entry.events;

        const guestRelation =
            Array.isArray(entry.guests)
                ? entry.guests[0]
                : entry.guests;

        if (
            !eventRelation ||
            !eventRelation.is_active
        ) {
            return NextResponse.json(
                {
                    error:
                        "This guest does not belong to the active event.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            entry.status === "cancelled"
        ) {
            return NextResponse.json(
                {
                    error:
                        "A cancelled guest cannot be checked in or checked out.",
                },
                {
                    status: 400,
                }
            );
        }

        const newStatus =
            action === "check_in"
                ? "checked_in"
                : "confirmed";

        /*
         * Avoid updating if the guest already has
         * the requested status.
         */
        if (
            entry.status === newStatus
        ) {
            return NextResponse.json({
                success: true,
                unchanged: true,
                action,
                guest: {
                    entryId: entry.id,
                    name:
                        guestRelation?.name ||
                        "Guest",
                    status:
                        entry.status,
                },
            });
        }

        const {
            data: updatedEntry,
            error: updateError,
        } = await adminClient
            .from("guest_list_entries")
            .update({
                status: newStatus,
            })
            .eq("id", entryId)
            .select(
                "id, status"
            )
            .single();

        if (
            updateError ||
            !updatedEntry
        ) {
            console.error(
                "Guest status update error:",
                updateError
            );

            return NextResponse.json(
                {
                    error:
                        updateError?.message ||
                        "The guest status could not be updated.",
                },
                {
                    status: 500,
                }
            );
        }

        return NextResponse.json({
            success: true,
            unchanged: false,
            action,
            guest: {
                entryId:
                    updatedEntry.id,
                name:
                    guestRelation?.name ||
                    "Guest",
                status:
                    updatedEntry.status,
            },
            updatedBy: {
                id:
                    userData.user.id,
                name:
                    profile.display_name ||
                    "Host",
            },
        });
    } catch (error) {
        console.error(
            "Unexpected host check-in error:",
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