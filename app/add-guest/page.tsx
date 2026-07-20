"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AddGuestPage() {

    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        instagram: "",
        vip_level: "Regular",
        notes: ""
    });


    async function handleSubmit() {

        const { data, error } = await supabase
            .from("guests")
            .insert([form])
            .select();


        if (error) {

            alert(error.message);
            console.log(error);

            return;
        }


        console.log("Guest added:", data);

        alert("Guest added successfully");

        router.push("/guests");

    }


    return (

        <main className="min-h-screen bg-black text-white p-10">


            <h1 className="text-4xl font-bold">
                Add Guest
            </h1>


            <div className="mt-10 max-w-xl space-y-5">


                <input
                    placeholder="Name"
                    className="w-full bg-zinc-900 p-4 rounded-lg"
                    onChange={(e) => setForm({
                        ...form,
                        name: e.target.value
                    })}
                />


                <input
                    placeholder="Phone"
                    className="w-full bg-zinc-900 p-4 rounded-lg"
                    onChange={(e) => setForm({
                        ...form,
                        phone: e.target.value
                    })}
                />


                <input
                    placeholder="Email"
                    className="w-full bg-zinc-900 p-4 rounded-lg"
                    onChange={(e) => setForm({
                        ...form,
                        email: e.target.value
                    })}
                />


                <input
                    placeholder="Instagram"
                    className="w-full bg-zinc-900 p-4 rounded-lg"
                    onChange={(e) => setForm({
                        ...form,
                        instagram: e.target.value
                    })}
                />


                <select
                    value={form.vip_level}
                    className="w-full bg-zinc-900 p-4 rounded-lg"
                    onChange={(e) => setForm({
                        ...form,
                        vip_level: e.target.value
                    })}
                >

                    <option value="Regular">
                        Regular
                    </option>

                    <option value="VIP">
                        VIP
                    </option>

                    <option value="BLACK">
                        BLACK
                    </option>

                </select>


                <textarea
                    placeholder="Notes"
                    className="w-full bg-zinc-900 p-4 rounded-lg"
                    onChange={(e) => setForm({
                        ...form,
                        notes: e.target.value
                    })}
                />


                <button
                    type="button"
                    onClick={handleSubmit}
                    className="bg-white text-black px-6 py-3 rounded-lg font-bold"
                >
                    Save Guest
                </button>


            </div>


        </main>

    );
}