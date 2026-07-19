import { NextResponse } from "next/server";
import twilio from "twilio";


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

}