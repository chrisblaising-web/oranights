"use client";

import { useState } from "react";

export default function SMSPage() {

    const [title, setTitle] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [audience, setAudience] = useState("VIP");
    const [status, setStatus] = useState("");


    async function sendSMS() {

        setStatus("Sending...");


        const response = await fetch("/api/send-sms", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },


            body: JSON.stringify({

                phone,
                message

            })

        });


        const data = await response.json();


        if (data.success) {

            setStatus("SMS sent successfully ✅");

        } else {

            setStatus("SMS failed ❌");

            console.log(data);

        }

    }



    return (

        <main className="min-h-screen bg-black text-white p-10">


            <h1 className="text-4xl font-bold">
                SMS Campaigns
            </h1>



            <div className="mt-10 max-w-xl space-y-5">



                <input
                    placeholder="Campaign name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 p-4 rounded"
                />



                <input
                    placeholder="Phone number +1..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-900 p-4 rounded"
                />



                <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full bg-zinc-900 p-4 rounded"
                >

                    <option>
                        VIP
                    </option>

                    <option>
                        All Guests
                    </option>

                    <option>
                        Influencers
                    </option>

                    <option>
                        Birthday
                    </option>

                </select>




                <textarea
                    placeholder="Write your SMS..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-zinc-900 p-4 rounded h-40"
                />




                <button
                    onClick={sendSMS}
                    className="bg-white text-black px-6 py-3 rounded"
                >
                    Send SMS
                </button>



                <p>
                    {status}
                </p>



            </div>


        </main>

    );

}