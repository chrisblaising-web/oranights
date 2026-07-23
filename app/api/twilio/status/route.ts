import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateRequest } from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ERROR_MESSAGE_LENGTH = 1_000;

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

function getWebhookUrl(request: NextRequest) {
  const configuredUrl =
    process.env.TWILIO_STATUS_WEBHOOK_URL?.trim();

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

  return validateRequest(
    authToken,
    signature,
    getWebhookUrl(request),
    params
  );
}

function isValidMessageSid(value: string) {
  return /^SM[a-fA-F0-9]{32}$/.test(value);
}

const ALLOWED_STATUSES = new Set([
  "accepted",
  "scheduled",
  "queued",
  "sending",
  "sent",
  "delivered",
  "undelivered",
  "failed",
  "canceled",
  "read",
]);

export async function POST(
  request: NextRequest
) {
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
      return jsonResponse(
        {
          success: false,
          error: "Unsupported content type.",
        },
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
      return jsonResponse(
        {
          success: false,
          error:
            "Webhook request is too large.",
        },
        413
      );
    }

    const form = await request.formData();
    const params = formDataToObject(form);

    if (
      !isValidTwilioRequest(
        request,
        params
      )
    ) {
      console.warn(
        "Rejected Twilio status webhook with invalid signature."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid Twilio signature.",
        },
        403
      );
    }

    const sid = String(
      form.get("MessageSid") || ""
    ).trim();

    const status = String(
      form.get("MessageStatus") || ""
    )
      .trim()
      .toLowerCase();

    const errorCode = String(
      form.get("ErrorCode") || ""
    )
      .trim()
      .slice(0, 20);

    const errorMessage = String(
      form.get("ErrorMessage") || ""
    )
      .trim()
      .slice(0, MAX_ERROR_MESSAGE_LENGTH);

    if (!sid || !status) {
      return jsonResponse(
        {
          success: false,
          error:
            "MessageSid and MessageStatus are required.",
        },
        400
      );
    }

    if (!isValidMessageSid(sid)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid MessageSid.",
        },
        400
      );
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid MessageStatus.",
        },
        400
      );
    }

    if (
      errorCode &&
      !/^\d{1,10}$/.test(errorCode)
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid ErrorCode.",
        },
        400
      );
    }

    const admin = createSupabaseAdmin();

    if (!admin) {
      console.error(
        "Missing Supabase server credentials."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The SMS service is temporarily unavailable.",
        },
        500
      );
    }

    const now = new Date().toISOString();

    const update = {
      status,
      error_message:
        errorMessage ||
        (errorCode
          ? `Twilio error ${errorCode}`
          : null),
      twilio_error_code:
        errorCode || null,
      delivered_at:
        status === "delivered"
          ? now
          : null,
      updated_at: now,
    };

    const [
      messageResult,
      logResult,
    ] = await Promise.all([
      admin
        .from("sms_messages")
        .update(update)
        .eq("twilio_sid", sid)
        .select("id"),
      admin
        .from("sms_logs")
        .update(update)
        .eq("twilio_sid", sid)
        .select("id"),
    ]);

    if (
      messageResult.error &&
      logResult.error
    ) {
      console.error(
        "Twilio status update failed:",
        {
          smsMessages:
            messageResult.error,
          smsLogs:
            logResult.error,
        }
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to update SMS delivery status.",
        },
        500
      );
    }

    if (messageResult.error) {
      console.error(
        "sms_messages status update failed:",
        messageResult.error
      );
    }

    if (logResult.error) {
      console.error(
        "sms_logs status update failed:",
        logResult.error
      );
    }

    const updatedCount =
      (messageResult.data?.length || 0) +
      (logResult.data?.length || 0);

    return jsonResponse(
      {
        success: true,
        updated: updatedCount,
      },
      200
    );
  } catch (error) {
    console.error(
      "Twilio callback error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "The delivery status could not be processed.",
      },
      500
    );
  }
}

export async function GET() {
  return jsonResponse(
    {
      success: true,
      route: "/api/twilio/status",
      message:
        "Twilio delivery status webhook is active.",
    },
    200
  );
}
