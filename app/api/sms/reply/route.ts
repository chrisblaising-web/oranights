import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReplyRequestBody = {
  phone?: string;
  guestId?: number | null;
  guestName?: string | null;
  message?: string;
};

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
  const cleanedPhone = phone.trim().replace(/[^\d+]/g, "");

  if (cleanedPhone.startsWith("+")) {
    return cleanedPhone;
  }

  const digitsOnly = cleanedPhone.replace(/\D/g, "");

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (
    digitsOnly.length === 11 &&
    digitsOnly.startsWith("1")
  ) {
    return `+${digitsOnly}`;
  }

  return cleanedPhone;
}

function isValidE164Phone(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function getStatusCallbackUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();

  if (!appBaseUrl) {
    return null;
  }

  const cleanedBaseUrl = appBaseUrl.replace(/\/+$/, "");

  return `${cleanedBaseUrl}/api/twilio/status`;
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      },
      {
        status: 500,
      }
    );
  }

  const accountSid =
    process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken =
    process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioPhoneNumber = normalizePhone(
    process.env.TWILIO_PHONE_NUMBER || ""
  );

  if (
    !accountSid ||
    !authToken ||
    !twilioPhoneNumber
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing Twilio account SID, auth token, or phone number.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const requestBody =
      (await request.json()) as ReplyRequestBody;

    const phone = normalizePhone(
      String(requestBody.phone || "")
    );

    const message = String(
      requestBody.message || ""
    ).trim();

    const guestId =
      typeof requestBody.guestId === "number"
        ? requestBody.guestId
        : null;

    const guestName =
      typeof requestBody.guestName === "string" &&
      requestBody.guestName.trim()
        ? requestBody.guestName.trim()
        : null;

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "A guest phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidE164Phone(phone)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The guest phone number is invalid. Use a format such as +15145551234.",
        },
        {
          status: 400,
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "A reply message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 1600) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The reply is too long. Keep it under 1,600 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const twilioClient = twilio(
      accountSid,
      authToken
    );

    const statusCallbackUrl =
      getStatusCallbackUrl();

    const twilioMessage =
      await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phone,
        ...(statusCallbackUrl
          ? {
              statusCallback:
                statusCallbackUrl,
            }
          : {}),
      });

    const now = new Date().toISOString();

    const outboundRecord = {
      guest_id: guestId,
      guest_name: guestName,
      phone,
      direction: "outbound",
      message,
      status:
        twilioMessage.status || "queued",
      twilio_sid:
        twilioMessage.sid || null,
      twilio_error_code: null,
      error_message: null,
      is_read: true,
      created_at: now,
      updated_at: now,
      delivered_at: null,
    };

    const { data: savedMessage, error: insertError } =
      await supabase
        .from("sms_messages")
        .insert(outboundRecord)
        .select(
          `
            id,
            guest_id,
            guest_name,
            phone,
            direction,
            message,
            status,
            twilio_sid,
            twilio_error_code,
            error_message,
            is_read,
            created_at,
            updated_at,
            delivered_at
          `
        )
        .single();

    if (insertError) {
      console.error(
        "Twilio sent the reply, but Supabase could not save it:",
        insertError
      );

      return NextResponse.json(
        {
          success: true,
          warning:
            "The SMS was sent, but the CRM could not save the message history.",
          twilioSid:
            twilioMessage.sid,
          status:
            twilioMessage.status,
        },
        {
          status: 200,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully.",
      sms: savedMessage,
      twilioSid: twilioMessage.sid,
      status:
        twilioMessage.status || "queued",
      statusCallbackEnabled:
        Boolean(statusCallbackUrl),
    });
  } catch (error) {
    console.error(
      "SMS reply API error:",
      error
    );

    let errorMessage =
      "Unable to send the SMS reply.";

    let errorCode:
      | string
      | number
      | null = null;

    if (
      typeof error === "object" &&
      error !== null
    ) {
      const possibleError = error as {
        message?: string;
        code?: string | number;
      };

      if (possibleError.message) {
        errorMessage =
          possibleError.message;
      }

      if (possibleError.code) {
        errorCode =
          possibleError.code;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    route: "/api/sms/reply",
    message:
      "The SMS reply API route is active.",
  });
}