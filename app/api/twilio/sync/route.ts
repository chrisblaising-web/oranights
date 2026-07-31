import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSupabaseAdmin() {
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }

    return createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}

function normalizePhone(phone: string | null) {
    if (!phone) return "";

    const digits = phone.replace(/\D/g, "");

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    if (
        digits.length === 11 &&
        digits.startsWith("1")
    ) {
        return `+${digits}`;
    }

    return phone.startsWith("+")
        ? phone
        : `+${digits}`;
}

export async function GET(
    request: NextRequest
) {
    const authorization = request.headers
        .get("authorization")
        ?.trim();

    const expectedSecret =
        process.env.CRON_SECRET?.trim();

    if (
        !expectedSecret ||
        authorization !==
        `Bearer ${expectedSecret}`
    ) {
        return NextResponse.json(
            {
                success: false,
                error: "Unauthorized.",
                cronSecretLoaded:
                    Boolean(expectedSecret),
            },
            {
                status: 401,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }

    const accountSid =
        process.env.TWILIO_ACCOUNT_SID;

    const authToken =
        process.env.TWILIO_AUTH_TOKEN;

    const twilioNumber =
        process.env.TWILIO_PHONE_NUMBER;

    const supabase =
        createSupabaseAdmin();

    if (
        !accountSid ||
        !authToken ||
        !twilioNumber ||
        !supabase
    ) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "Missing Twilio or Supabase configuration.",
                missing: {
                    accountSid: !accountSid,
                    authToken: !authToken,
                    twilioNumber:
                        !twilioNumber,
                    supabase: !supabase,
                },
            },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }

    try {
        const client = twilio(
            accountSid,
            authToken
        );

        const since = new Date();
        since.setDate(
            since.getDate() - 7
        );

        const messages =
            await client.messages.list({
                dateSentAfter: since,
                limit: 1000,
            });

        const {
            data: guests,
            error: guestsError,
        } = await supabase
            .from("guests")
            .select("id, name, phone");

        if (guestsError) {
            throw new Error(
                `Unable to load guests: ${guestsError.message}`
            );
        }

        const guestsByPhone = new Map<
            string,
            {
                id: number;
                name: string | null;
            }
        >();

        for (const guest of guests ?? []) {
            const digits = String(
                guest.phone || ""
            )
                .replace(/\D/g, "")
                .slice(-10);

            if (digits) {
                guestsByPhone.set(
                    digits,
                    {
                        id: guest.id,
                        name:
                            guest.name ||
                            null,
                    }
                );
            }
        }

        let inserted = 0;
        let updated = 0;
        let failed = 0;

        const failures: Array<{
            sid: string;
            action:
            | "insert"
            | "update";
            error: string;
        }> = [];

        for (const message of messages) {
            const isInbound =
                message.direction ===
                "inbound";

            const guestPhone =
                normalizePhone(
                    isInbound
                        ? message.from
                        : message.to
                );

            const phoneDigits =
                guestPhone
                    .replace(/\D/g, "")
                    .slice(-10);

            const matchingGuest =
                guestsByPhone.get(
                    phoneDigits
                );

            const guestId =
                matchingGuest?.id ??
                null;

            const guestName =
                matchingGuest?.name ??
                null;

            const record = {
                guest_id: guestId,
                guest_name: guestName,
                phone: guestPhone,
                direction: isInbound
                    ? "inbound"
                    : "outbound",
                message:
                    message.body || "",
                status:
                    message.status ||
                    "unknown",
                twilio_sid:
                    message.sid,
                twilio_error_code:
                    message.errorCode?.toString() ||
                    null,
                error_message:
                    message.errorMessage ||
                    null,
                is_read: !isInbound,
                created_at:
                    message.dateSent?.toISOString() ||
                    message.dateCreated?.toISOString() ||
                    new Date().toISOString(),
                updated_at:
                    new Date().toISOString(),
                delivered_at:
                    message.status ===
                        "delivered" &&
                        message.dateUpdated
                        ? message.dateUpdated.toISOString()
                        : null,
            };

            const {
                data: existing,
                error: existingError,
            } = await supabase
                .from("sms_messages")
                .select("id")
                .eq(
                    "twilio_sid",
                    message.sid
                )
                .maybeSingle();

            if (existingError) {
                failed += 1;

                failures.push({
                    sid: message.sid,
                    action: "update",
                    error:
                        existingError.message,
                });

                continue;
            }

            if (existing) {
                const { error } =
                    await supabase
                        .from(
                            "sms_messages"
                        )
                        .update({
                            guest_id:
                                record.guest_id,
                            guest_name:
                                record.guest_name,
                            phone:
                                record.phone,
                            direction:
                                record.direction,
                            message:
                                record.message,
                            status:
                                record.status,
                            twilio_error_code:
                                record.twilio_error_code,
                            error_message:
                                record.error_message,
                            delivered_at:
                                record.delivered_at,
                            updated_at:
                                record.updated_at,
                        })
                        .eq(
                            "id",
                            existing.id
                        );

                if (error) {
                    failed += 1;

                    failures.push({
                        sid:
                            message.sid,
                        action:
                            "update",
                        error:
                            error.message,
                    });
                } else {
                    updated += 1;
                }
            } else {
                const { error } =
                    await supabase
                        .from(
                            "sms_messages"
                        )
                        .insert(record);

                if (error) {
                    failed += 1;

                    failures.push({
                        sid:
                            message.sid,
                        action:
                            "insert",
                        error:
                            error.message,
                    });
                } else {
                    inserted += 1;
                }
            }
        }

        console.log(
            "Twilio sync complete:",
            {
                checked:
                    messages.length,
                inserted,
                updated,
                failed,
            }
        );

        return NextResponse.json(
            {
                success: failed === 0,
                checked:
                    messages.length,
                inserted,
                updated,
                failed,
                failures:
                    failures.slice(
                        0,
                        20
                    ),
            },
            {
                status:
                    failed === 0
                        ? 200
                        : 207,
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "Twilio synchronization error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Twilio synchronization failed.",
            },
            {
                status: 500,
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    }
}