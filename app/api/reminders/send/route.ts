import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REMINDERS_PER_RUN = 100;

type ReminderEntry = {
    id: number;
    event_id: number;
    guest_id: number | null;
    phone: string;
    reminder_status: string;
    reminder_scheduled_for: string;
    sms_opted_out: boolean;
    events:
    | {
        id: number;
        name: string;
        reminder_message: string | null;
        is_active: boolean;
    }
    | {
        id: number;
        name: string;
        reminder_message: string | null;
        is_active: boolean;
    }[]
    | null;
};

function createSupabaseAdmin() {
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        return null;
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

function createTwilioClient() {
    const accountSid =
        process.env.TWILIO_ACCOUNT_SID;

    const authToken =
        process.env.TWILIO_AUTH_TOKEN;

    const fromNumber =
        process.env.TWILIO_PHONE_NUMBER;

    if (
        !accountSid ||
        !authToken ||
        !fromNumber
    ) {
        return null;
    }

    return {
        client: twilio(accountSid, authToken),
        fromNumber,
    };
}

function jsonResponse(
    body: Record<string, unknown>,
    status: number
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

function isAuthorizedCronRequest(
    request: NextRequest
) {
    const expectedSecret =
        process.env.CRON_SECRET?.trim();

    if (!expectedSecret) {
        return false;
    }

    const authorization =
        request.headers
            .get("authorization")
            ?.trim();

    if (
        authorization ===
        `Bearer ${expectedSecret}`
    ) {
        return true;
    }

    const querySecret =
        request.nextUrl.searchParams.get(
            "secret"
        );

    return querySecret === expectedSecret;
}

function getEvent(
    entry: ReminderEntry
) {
    if (!entry.events) {
        return null;
    }

    return Array.isArray(entry.events)
        ? entry.events[0] || null
        : entry.events;
}

export async function POST(
    request: NextRequest
) {
    if (!isAuthorizedCronRequest(request)) {
        return jsonResponse(
            {
                success: false,
                error: "Unauthorized.",
            },
            401
        );
    }

    const supabase = createSupabaseAdmin();
    const twilioService =
        createTwilioClient();

    if (!supabase || !twilioService) {
        console.error(
            "Reminder sender is missing server configuration."
        );

        return jsonResponse(
            {
                success: false,
                error:
                    "The reminder service is temporarily unavailable.",
            },
            500
        );
    }

    try {
        const now =
            new Date().toISOString();

        const {
            data,
            error,
        } = await supabase
            .from("guest_list_entries")
            .select(
                `
          id,
          event_id,
          guest_id,
          phone,
          reminder_status,
          reminder_scheduled_for,
          sms_opted_out,
          events (
            id,
            name,
            reminder_message,
            is_active
          )
        `
            )
            .eq("reminder_status", "pending")
            .eq("sms_opted_out", false)
            .lte(
                "reminder_scheduled_for",
                now
            )
            .order("reminder_scheduled_for", {
                ascending: true,
            })
            .limit(MAX_REMINDERS_PER_RUN);

        if (error) {
            console.error(
                "Reminder lookup error:",
                error
            );

            return jsonResponse(
                {
                    success: false,
                    error:
                        "Due reminders could not be loaded.",
                },
                500
            );
        }

        const reminders =
            (data || []) as ReminderEntry[];

        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const reminder of reminders) {
            const event = getEvent(reminder);

            if (
                !event ||
                !event.is_active ||
                !event.reminder_message
            ) {
                skipped += 1;

                await supabase
                    .from("guest_list_entries")
                    .update({
                        reminder_status: "skipped",
                        reminder_error:
                            !event
                                ? "Event not found."
                                : !event.is_active
                                    ? "Event is inactive."
                                    : "Reminder message is missing.",
                    })
                    .eq("id", reminder.id)
                    .eq(
                        "reminder_status",
                        "pending"
                    );

                continue;
            }

            const {
                data: lockedEntry,
                error: lockError,
            } = await supabase
                .from("guest_list_entries")
                .update({
                    reminder_status:
                        "processing",
                    reminder_error: null,
                })
                .eq("id", reminder.id)
                .eq(
                    "reminder_status",
                    "pending"
                )
                .select("id")
                .maybeSingle();

            if (lockError) {
                console.error(
                    "Reminder lock error:",
                    lockError
                );

                failed += 1;
                continue;
            }

            if (!lockedEntry) {
                skipped += 1;
                continue;
            }

            try {
                const statusCallback =
                    process.env
                        .TWILIO_STATUS_WEBHOOK_URL;

                const message =
                    await twilioService.client
                        .messages.create({
                            to: reminder.phone,
                            from:
                                twilioService.fromNumber,
                            body:
                                event.reminder_message,
                            ...(statusCallback
                                ? {
                                    statusCallback,
                                }
                                : {}),
                        });

                const sentAt =
                    new Date().toISOString();

                await supabase
                    .from("guest_list_entries")
                    .update({
                        reminder_status: "sent",
                        reminder_sent_at: sentAt,
                        reminder_twilio_sid:
                            message.sid,
                        reminder_error: null,
                    })
                    .eq("id", reminder.id);

                await supabase
                    .from("sms_messages")
                    .insert({
                        guest_id:
                            reminder.guest_id,
                        guest_name: null,
                        phone: reminder.phone,
                        direction: "outbound",
                        message:
                            event.reminder_message,
                        status:
                            message.status || "queued",
                        twilio_sid: message.sid,
                        twilio_error_code: null,
                        error_message: null,
                        is_read: true,
                        created_at: sentAt,
                        updated_at: sentAt,
                        delivered_at: null,
                    });

                sent += 1;
            } catch (smsError) {
                failed += 1;

                const message =
                    smsError instanceof Error
                        ? smsError.message.slice(
                            0,
                            500
                        )
                        : "Unable to send reminder SMS.";

                console.error(
                    "Reminder SMS error:",
                    smsError
                );

                await supabase
                    .from("guest_list_entries")
                    .update({
                        reminder_status: "failed",
                        reminder_error: message,
                    })
                    .eq("id", reminder.id);
            }
        }

        return jsonResponse(
            {
                success: true,
                processed:
                    reminders.length,
                sent,
                failed,
                skipped,
            },
            200
        );
    } catch (error) {
        console.error(
            "Reminder sender error:",
            error
        );

        return jsonResponse(
            {
                success: false,
                error:
                    "The reminder run could not be completed.",
            },
            500
        );
    }
}

export async function GET(
    request: NextRequest
) {
    return POST(request);
}
