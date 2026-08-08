import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

type NotificationPayload = {
  name?: string;
  phone?: string;
  instagram?: string;
  vipLevel?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication is required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

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
          success: false,
          error: "Supabase authentication is not configured.",
        },
        {
          status: 500,
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
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your session is invalid or has expired. Please log in again.",
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify user permissions.",
        },
        {
          status: 500,
        }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to send admin notifications.",
        },
        {
          status: 403,
        }
      );
    }

    const payload =
      (await request.json()) as NotificationPayload;

    const adminPhone =
      process.env.ADMIN_NOTIFICATION_PHONE;

    const accountSid =
      process.env.TWILIO_ACCOUNT_SID;

    const authToken =
      process.env.TWILIO_AUTH_TOKEN;

    const twilioPhone =
      process.env.TWILIO_PHONE_NUMBER;

    if (
      !adminPhone ||
      !accountSid ||
      !authToken ||
      !twilioPhone
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Admin notification environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const client = twilio(
      accountSid,
      authToken
    );

    const message = [
      "New client added 🎉",
      `Name: ${payload.name || "Not provided"}`,
      `Phone: ${payload.phone || "Not provided"}`,
      `Instagram: ${payload.instagram || "Not provided"}`,
      `VIP: ${payload.vipLevel || "Regular"}`,
    ].join("\n");

    const sms =
      await client.messages.create({
        body: message,
        from: twilioPhone,
        to: adminPhone,
      });

    return NextResponse.json({
      success: true,
      sid: sms.sid,
      status: sms.status,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Notification failed.";

    console.error(
      "New client notification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
