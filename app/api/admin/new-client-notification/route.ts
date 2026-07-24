import { NextResponse } from "next/server";
import twilio from "twilio";

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