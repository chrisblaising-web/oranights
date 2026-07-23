import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateRequest } from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 5_000;
const MAX_MEDIA_COUNT = 10;

function createSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return null;
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

function normalizePhone(phone: string) {
    const cleaned = phone.replace(/[^\d+]/g, "");

    if (cleaned.startsWith("+")) {
        return cleaned;
    }

    const digits = cleaned.replace(/\D/g, "");

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    if (digits.length === 11 && digits.startsWith("1")) {
        return `+${digits}`;
    }

    return cleaned;
}

function getPhoneVariants(phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const digitsOnly = normalizedPhone.replace(/\D/g, "");

    const variants = new Set<string>();

    if (normalizedPhone) {
        variants.add(normalizedPhone);
    }

    if (digitsOnly) {
        variants.add(digitsOnly);
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
        variants.add(digitsOnly.substring(1));
        variants.add(`+${digitsOnly}`);
    }

    if (digitsOnly.length === 10) {
        variants.add(`+1${digitsOnly}`);
        variants.add(`1${digitsOnly}`);
    }

    return Array.from(variants);
}

function createEmptyTwimlResponse() {
    return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        {
            status: 200,
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "Cache-Control": "no-store",
            },
        }
    );
}

function createErrorResponse(message: string, status: number) {
    return new NextResponse(message, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

function getWebhookUrl(request: NextRequest) {
    const configuredUrl =
        process.env.TWILIO_INBOUND_WEBHOOK_URL?.trim();

    if (configuredUrl) {
        return configuredUrl;
    }

    const forwardedProto =
        request.headers.get("x-forwarded-proto");
    const forwardedHost =
        request.headers.get("x-forwarded-host");
    const host =
        forwardedHost ||
        request.headers.get("host");

    if (forwardedProto && host) {
        return `${forwardedProto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
    }

    return request.url;
}

function formDataToObject(formData: FormData) {
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
            params[key] = value;
        }
    }

    return params;
}

function isValidTwilioRequest(
    request: NextRequest,
    params: Record<string, string>
) {
    const authToken =
        process.env.TWILIO_AUTH_TOKEN?.trim();

    const signature =
        request.headers
            .get("x-twilio-signature")
            ?.trim();

    if (!authToken || !signature) {
        return false;
    }

    const webhookUrl = getWebhookUrl(request);

    return validateRequest(
        authToken,
        signature,
        webhookUrl,
        params
    );
}

export async function POST(request: NextRequest) {
    try {
        const contentType =
            request.headers.get("content-type") || "";

        if (
            !contentType
                .toLowerCase()
                .includes(
                    "application/x-www-form-urlencoded"
                ) &&
            !contentType
                .toLowerCase()
                .includes("multipart/form-data")
        ) {
            return createErrorResponse(
                "Unsupported content type.",
                415
            );
        }

        const declaredContentLength = Number(
            request.headers.get("content-length") ||
            "0"
        );

        if (
            Number.isFinite(declaredContentLength) &&
            declaredContentLength > 25_000
        ) {
            return createErrorResponse(
                "Webhook request is too large.",
                413
            );
        }

        const formData = await request.formData();
        const webhookParams =
            formDataToObject(formData);

        if (
            !isValidTwilioRequest(
                request,
                webhookParams
            )
        ) {
            console.warn(
                "Rejected inbound SMS webhook with invalid Twilio signature."
            );

            return createErrorResponse(
                "Invalid Twilio signature.",
                403
            );
        }

        const supabase = createSupabaseAdmin();

        if (!supabase) {
            console.error(
                "Missing Supabase server credentials."
            );

            return createErrorResponse(
                "Server configuration error.",
                500
            );
        }

        const from = String(
            formData.get("From") || ""
        ).trim();

        const to = String(
            formData.get("To") || ""
        ).trim();

        const body = String(
            formData.get("Body") || ""
        )
            .trim()
            .slice(0, MAX_BODY_LENGTH);

        const messageSid = String(
            formData.get("MessageSid") || ""
        )
            .trim()
            .slice(0, 100);

        const smsStatus = String(
            formData.get("SmsStatus") ||
            "received"
        )
            .trim()
            .slice(0, 50);

        const rawNumMedia = Number(
            formData.get("NumMedia") || 0
        );

        const numMedia =
            Number.isInteger(rawNumMedia) &&
                rawNumMedia >= 0
                ? Math.min(
                    rawNumMedia,
                    MAX_MEDIA_COUNT
                )
                : 0;

        if (!from) {
            console.error(
                "Inbound SMS webhook did not include a From number."
            );

            return createEmptyTwimlResponse();
        }

        if (!body && numMedia === 0) {
            console.error(
                "Inbound SMS webhook did not include a message body."
            );

            return createEmptyTwimlResponse();
        }

        const normalizedPhone =
            normalizePhone(from);

        if (!normalizedPhone) {
            return createEmptyTwimlResponse();
        }

        const phoneVariants =
            getPhoneVariants(from);

        let guestId: number | null = null;
        let guestName: string | null = null;

        const {
            data: matchingGuests,
            error: guestLookupError,
        } = await supabase
            .from("guests")
            .select("id, name, phone")
            .in("phone", phoneVariants)
            .limit(1);

        if (guestLookupError) {
            console.error(
                "Guest lookup error:",
                guestLookupError
            );
        }

        if (
            matchingGuests &&
            matchingGuests.length > 0
        ) {
            const guest = matchingGuests[0];

            guestId = guest.id;
            guestName = guest.name || null;
        }

        let storedMessage = body;

        if (!storedMessage && numMedia > 0) {
            storedMessage =
                numMedia === 1
                    ? "[Guest sent one media attachment]"
                    : `[Guest sent ${numMedia} media attachments]`;
        }

        const now = new Date().toISOString();

        const messageRecord = {
            guest_id: guestId,
            guest_name: guestName,
            phone: normalizedPhone,
            direction: "inbound",
            message: storedMessage,
            status: smsStatus || "received",
            twilio_sid: messageSid || null,
            twilio_error_code: null,
            error_message: null,
            is_read: false,
            created_at: now,
            updated_at: now,
            delivered_at: null,
        };

        const { error: insertError } =
            await supabase
                .from("sms_messages")
                .insert(messageRecord);

        if (insertError) {
            const isDuplicateMessage =
                insertError.code === "23505";

            if (isDuplicateMessage) {
                console.log(
                    `Inbound SMS ${messageSid} was already saved.`
                );

                return createEmptyTwimlResponse();
            }

            console.error(
                "Inbound SMS insert error:",
                insertError
            );

            return createErrorResponse(
                "Unable to save inbound SMS.",
                500
            );
        }

        console.log("Inbound SMS saved:", {
            from: normalizedPhone,
            to,
            guestId,
            guestName,
            messageSid,
            status: smsStatus,
        });

        return createEmptyTwimlResponse();
    } catch (error) {
        console.error(
            "Unexpected inbound SMS webhook error:",
            error
        );

        return createErrorResponse(
            "Unexpected server error.",
            500
        );
    }
}

export async function GET() {
    return NextResponse.json(
        {
            success: true,
            route: "/api/twilio/inbound",
            message:
                "Twilio inbound SMS webhook is active.",
        },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        }
    );
}
