import { NextResponse } from "next/server";
import twilio from "twilio";
<<<<<<< HEAD
import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

type SmsPayload = {
  guestId?: number | null;
  campaignId?: number | null;
  campaign?: string;
  audience?: string;
  phone?: string;
  name?: string | null;
  message?: string;
  messageTemplate?: string;
  checkOnly?: boolean;
  allowDuplicate?: boolean;
};

const DUPLICATE_STATUSES = [
  "accepted",
  "queued",
  "sending",
  "sent",
  "delivered",
];

function createSupabaseAdmin(): SupabaseClient | null {
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

function createSupabaseAuthClient(): SupabaseClient | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function requireAuthenticatedUser(
  req: Request
): Promise<
  | {
      success: true;
      userId: string;
      email: string | null;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  const authorization =
    req.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Authentication is required to send SMS.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Authentication token is missing.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const authClient =
    createSupabaseAuthClient();

  if (!authClient) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Supabase authentication is not configured.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);

  if (error || !user) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Your session is invalid or has expired. Please log in again.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  return {
    success: true,
    userId: user.id,
    email: user.email ?? null,
  };
}

function normalizePhoneNumber(
  value?: string
): string {
  const original =
    value?.trim() || "";

  if (!original) {
    return "";
  }

  const digits =
    original.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  if (original.startsWith("+")) {
    return `+${digits}`;
  }

  if (
    digits.length >= 8 &&
    digits.length <= 15
  ) {
    return `+${digits}`;
  }

  return "";
}

export async function POST(
  req: Request
) {
  const authentication =
    await requireAuthenticatedUser(req);

  if (!authentication.success) {
    return authentication.response;
  }

  const authenticatedUserId =
    authentication.userId;

  let payload: SmsPayload = {};
  let createdLogId: number | null = null;

  try {
    payload =
      (await req.json()) as SmsPayload;

    const campaign =
      payload.campaign?.trim();

    const audience =
      payload.audience?.trim() ||
      "Single Guest";

    const phone =
      normalizePhoneNumber(
        payload.phone
      );

    const guestName =
      payload.name?.trim() || null;

    const message =
      payload.message?.trim();

    if (!campaign) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Campaign name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid phone number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^\+[1-9]\d{7,14}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The phone number is invalid. Use a number such as 4385551234 or +14385551234.",
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
          error:
            "SMS message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 320) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The SMS message cannot exceed 320 characters.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createSupabaseAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase logging is unavailable. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        {
          status: 500,
        }
      );
    }

    let duplicateQuery = admin
      .from("sms_logs")
      .select(
        "id,status,created_at"
      )
      .eq("phone", phone)
      .in(
        "status",
        DUPLICATE_STATUSES
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    duplicateQuery =
      duplicateQuery.eq(
        "campaign",
        campaign
      );

    const {
      data: existingLog,
      error: duplicateCheckError,
    } =
      await duplicateQuery.maybeSingle();

    if (duplicateCheckError) {
      throw new Error(
        `Duplicate check failed: ${duplicateCheckError.message}`
      );
    }

    if (payload.checkOnly) {
      return NextResponse.json({
        success: true,
        duplicate: Boolean(existingLog),
        existingStatus:
          existingLog?.status ?? null,
        existingCreatedAt:
          existingLog?.created_at ?? null,
      });
    }

    if (
      existingLog &&
      !payload.allowDuplicate
    ) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          error:
            "This guest or phone number already received this campaign.",
          existingStatus:
            existingLog.status,
          existingCreatedAt:
            existingLog.created_at,
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: pendingLog,
      error: pendingLogError,
    } = await admin
      .from("sms_logs")
      .insert({
        guest_id:
          payload.guestId ?? null,

        guest_name:
          guestName,

        campaign_id:
          payload.campaignId ?? null,

        campaign,

        audience,

        phone,

        message,

        status: "sending",

        error_message: null,

        updated_at:
          new Date().toISOString(),
      })
      .select("id")
      .single();

    if (
      pendingLogError ||
      !pendingLog
    ) {
      throw new Error(
        `SMS log could not be created: ${
          pendingLogError?.message ||
          "Unknown database error"
        }`
      );
    }

    createdLogId =
      Number(pendingLog.id);

    const accountSid =
      process.env
        .TWILIO_ACCOUNT_SID;

    const authToken =
      process.env
        .TWILIO_AUTH_TOKEN;

    const fromNumber =
      process.env
        .TWILIO_PHONE_NUMBER;

    if (
      !accountSid ||
      !authToken ||
      !fromNumber
    ) {
      throw new Error(
        "Twilio environment variables are missing."
      );
    }

    const client =
      twilio(
        accountSid,
        authToken
      );

    const appBaseUrl =
      process.env.APP_BASE_URL?.replace(
        /\/$/,
        ""
      ) ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(
        /\/$/,
        ""
      );

    const sms =
      await client.messages.create({
        body: message,
        from: fromNumber,
        to: phone,
        ...(appBaseUrl
          ? {
              statusCallback: `${appBaseUrl}/api/twilio/status`,
            }
          : {}),
      });

    const {
      error: updateLogError,
    } = await admin
      .from("sms_logs")
      .update({
        status:
          sms.status || "queued",

        twilio_sid:
          sms.sid,

        error_message:
          null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        createdLogId
      );

    if (updateLogError) {
      console.error(
        "SMS was sent, but the log update failed:",
        updateLogError
      );
    }

    const now =
      new Date().toISOString();

    const {
      error: conversationInsertError,
    } = await admin
      .from("sms_messages")
      .insert({
        guest_id:
          payload.guestId ?? null,

        guest_name:
          guestName,

        phone,

        direction:
          "outbound",

        message,

        status:
          sms.status || "queued",

        twilio_sid:
          sms.sid,

        twilio_error_code:
          null,

        error_message:
          null,

        is_read:
          true,

        created_at:
          now,

        updated_at:
          now,

        delivered_at:
          null,
      });

    if (conversationInsertError) {
      console.error(
        "SMS was sent, but the conversation history could not be updated:",
        conversationInsertError
      );
    }

    console.info(
      "Authenticated SMS send:",
      {
        userId:
          authenticatedUserId,
        campaign,
        phone,
        sid:
          sms.sid,
      }
    );

    return NextResponse.json({
      success: true,

      logId:
        createdLogId,

      sid:
        sms.sid,

      status:
        sms.status || "queued",

      phone,

      recipientName:
        guestName,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown SMS error";

    console.error(
      "SMS route error:",
      error
    );

    const admin =
      createSupabaseAdmin();

    if (
      admin &&
      createdLogId !== null
    ) {
      const {
        error: failedUpdateError,
      } = await admin
        .from("sms_logs")
        .update({
          status:
            "failed",

          error_message:
            errorMessage,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdLogId
        );

      if (failedUpdateError) {
        console.error(
          "Failed SMS log update failed:",
          failedUpdateError
        );
      }
    } else if (admin) {
      const normalizedPhone =
        normalizePhoneNumber(
          payload.phone
        ) || null;

      const {
        error: failedInsertError,
      } = await admin
        .from("sms_logs")
        .insert({
          guest_id:
            payload.guestId ?? null,

          guest_name:
            payload.name?.trim() ||
            null,

          campaign_id:
            payload.campaignId ??
            null,

          campaign:
            payload.campaign?.trim() ||
            "Untitled campaign",

          audience:
            payload.audience?.trim() ||
            "Single Guest",

          phone:
            normalizedPhone,

          message:
            payload.message?.trim() ||
            null,

          status:
            "failed",

          error_message:
            errorMessage,

          updated_at:
            new Date().toISOString(),
        });

      if (failedInsertError) {
        console.error(
          "Failed SMS logging also failed:",
          failedInsertError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          errorMessage,
      },
      {
        status: 500,
      }
    );
  }
=======


export async function POST(req: Request) {

    try {

        const { phone, message } = await req.json();


        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );


        const sms = await client.messages.create({

            body: message,

            from: process.env.TWILIO_PHONE_NUMBER,

            to: phone

        });


        return NextResponse.json({

            success: true,

            sid: sms.sid

        });


    } catch (error: any) {


        console.log(error);


        return NextResponse.json({

            success: false,

            error: error.message

        });


    }

>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152
}