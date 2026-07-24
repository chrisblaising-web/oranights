import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type HostRole = "admin" | "host";

type UserProfile = {
    role: HostRole;
    is_active: boolean;
    display_name: string | null;
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

function cleanText(
    value: unknown,
    maximumLength: number
) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .slice(0, maximumLength);
}

function normalizePhone(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const cleanValue = value.trim();

    if (!cleanValue) {
        return null;
    }

    const digits =
        cleanValue.replace(/\D/g, "");

    /*
     * Canadian or US number:
     * 5145551234 becomes +15145551234
     */
    if (digits.length === 10) {
        return `+1${digits}`;
    }

    /*
     * Number already containing country code:
     * 15145551234 becomes +15145551234
     */
    if (
        digits.length >= 11 &&
        digits.length <= 15
    ) {
        return `+${digits}`;
    }

    return null;
}

function cleanVipLevel(value: unknown) {
    const cleanValue =
        cleanText(value, 50);

    if (!cleanValue) {
        return "Regular";
    }

    return cleanValue;
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
         * Verify the user's Supabase login session.
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
         * Server-only client.
         * The service role key never reaches the browser.
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
            data: profileData,
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
                "Host profile lookup error:",
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

        const profile =
            profileData as UserProfile | null;

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
            profile.role !== "admin" &&
            profile.role !== "host"
        ) {
            return NextResponse.json(
                {
                    error:
                        "You do not have access to add event guests.",
                },
                {
                    status: 403,
                }
            );
        }

        const body =
            await request.json();

        const name =
            cleanText(body?.name, 150);

        const phone =
            normalizePhone(body?.phone);

        const vipLevel =
            cleanVipLevel(body?.vipLevel);

        if (name.length < 2) {
            return NextResponse.json(
                {
                    error:
                        "Enter the guest's full name.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!phone) {
            return NextResponse.json(
                {
                    error:
                        "Enter a valid phone number, including the area code.",
                },
                {
                    status: 400,
                }
            );
        }

        /*
         * Load the newest active event.
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
         * Check whether this phone number is already
         * registered for the active event.
         */
        const {
            data: existingEntry,
            error: existingEntryError,
        } = await adminClient
            .from("guest_list_entries")
            .select(
                `
                    id,
                    guest_id,
                    status
                `
            )
            .eq(
                "event_id",
                activeEvent.id
            )
            .eq("phone", phone)
            .maybeSingle();

        if (existingEntryError) {
            console.error(
                "Existing event entry error:",
                existingEntryError
            );

            return NextResponse.json(
                {
                    error:
                        "The event guest list could not be checked.",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * If already registered, check the guest in
         * instead of creating a duplicate entry.
         */
        if (existingEntry) {
            if (
                existingEntry.status !==
                "checked_in"
            ) {
                const {
                    error: existingUpdateError,
                } = await adminClient
                    .from(
                        "guest_list_entries"
                    )
                    .update({
                        status: "checked_in",
                    })
                    .eq(
                        "id",
                        existingEntry.id
                    );

                if (existingUpdateError) {
                    console.error(
                        "Existing guest check-in error:",
                        existingUpdateError
                    );

                    return NextResponse.json(
                        {
                            error:
                                "The existing guest could not be checked in.",
                        },
                        {
                            status: 500,
                        }
                    );
                }
            }

            return NextResponse.json({
                success: true,
                existingRegistration: true,
                alreadyCheckedIn:
                    existingEntry.status ===
                    "checked_in",
                event: {
                    id: activeEvent.id,
                    name: activeEvent.name,
                    venue: activeEvent.venue,
                    eventDate:
                        activeEvent.event_date,
                },
                guest: {
                    entryId:
                        existingEntry.id,
                    guestId:
                        existingEntry.guest_id,
                    name,
                    vipLevel,
                    status: "checked_in",
                },
            });
        }

        /*
         * Reuse an existing CRM guest with the same
         * phone number, or create a new guest.
         */
        const {
            data: existingGuest,
            error: existingGuestError,
        } = await adminClient
            .from("guests")
            .select(
                "id, name, vip_level, tag"
            )
            .eq("phone", phone)
            .maybeSingle();

        if (existingGuestError) {
            console.error(
                "Existing guest lookup error:",
                existingGuestError
            );

            return NextResponse.json(
                {
                    error:
                        "The guest database could not be checked.",
                },
                {
                    status: 500,
                }
            );
        }

        let guestId: number;
        let savedName = name;
        let savedVipLevel = vipLevel;
        let savedTag = vipLevel;

        if (existingGuest) {
            guestId = existingGuest.id;

            savedName =
                existingGuest.name || name;

            savedVipLevel =
                existingGuest.vip_level ||
                vipLevel;

            savedTag =
                existingGuest.tag ||
                savedVipLevel;
        } else {
            const {
                data: newGuest,
                error: guestInsertError,
            } = await adminClient
                .from("guests")
                .insert({
                    name,
                    phone,
                    email: null,
                    instagram: null,
                    vip_level: vipLevel,
                    tag: vipLevel,
                    notes:
                        "Added through Host Check-In portal",
                })
                .select(
                    "id, name, vip_level, tag"
                )
                .single();

            if (
                guestInsertError ||
                !newGuest
            ) {
                console.error(
                    "Walk-in guest insert error:",
                    guestInsertError
                );

                return NextResponse.json(
                    {
                        error:
                            guestInsertError?.message ||
                            "The new guest could not be created.",
                    },
                    {
                        status: 500,
                    }
                );
            }

            guestId = newGuest.id;
            savedName =
                newGuest.name || name;

            savedVipLevel =
                newGuest.vip_level ||
                vipLevel;

            savedTag =
                newGuest.tag ||
                savedVipLevel;
        }

        /*
         * Add the guest to the active event and
         * immediately mark the walk-in as checked in.
         */
        const {
            data: newEntry,
            error: entryInsertError,
        } = await adminClient
            .from("guest_list_entries")
            .insert({
                event_id:
                    activeEvent.id,
                guest_id: guestId,
                phone,
                status: "checked_in",
                invitation_status:
                    "pending",
                reminder_scheduled_for:
                    new Date().toISOString(),
                reminder_status:
                    "skipped",
                sms_opted_out:
                    false,
            })
            .select(
                "id, guest_id, status"
            )
            .single();

        if (
            entryInsertError ||
            !newEntry
        ) {
            console.error(
                "Walk-in event entry error:",
                entryInsertError
            );

            return NextResponse.json(
                {
                    error:
                        entryInsertError?.message ||
                        "The guest could not be added to the active event.",
                },
                {
                    status: 500,
                }
            );
        }

        return NextResponse.json({
            success: true,
            existingRegistration: false,
            alreadyCheckedIn: false,

            event: {
                id: activeEvent.id,
                name: activeEvent.name,
                venue: activeEvent.venue,
                eventDate:
                    activeEvent.event_date,
            },

            guest: {
                entryId: newEntry.id,
                guestId:
                    newEntry.guest_id,
                name: savedName,
                vipLevel:
                    savedVipLevel,
                tag: savedTag,
                status:
                    newEntry.status,
            },

            addedBy: {
                id:
                    userData.user.id,
                name:
                    profile.display_name ||
                    "Host",
            },
        });
    } catch (error) {
        console.error(
            "Unexpected walk-in guest error:",
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