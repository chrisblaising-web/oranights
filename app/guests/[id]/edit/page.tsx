"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function EditGuest({
    params,
}: {
    params: Promise<{ id: string }>
}) {

    const router = useRouter();

    const [guest, setGuest] = useState<any>(null);
    const [id, setId] = useState<string>("");


    useEffect(() => {

        async function loadGuest() {

            const { id } = await params;

            setId(id);


            const { data, error } = await supabase
                .from("guests")
                .select("*")
                .eq("id", Number(id))
                .single();


            if (error) {
                console.log(error);
                return;
            }


            setGuest(data);

        }


        loadGuest();

    }, [params]);



    async function updateGuest(e: React.FormEvent) {

        e.preventDefault();


        const { error } = await supabase
            .from("guests")
            .update({

                name: guest.name,
                phone: guest.phone,
                email: guest.email,
                instagram: guest.instagram,
                birthday: guest.birthday,
                vip_level: guest.vip_level,
                tag: guest.tag,
                notes: guest.notes

            })
            .eq("id", Number(id));



        if (error) {

            alert(error.message);
            console.log(error);

            return;
        }


        router.push(`/guests/${id}`);

    }



    if (!guest) {

        return (
            <main className="bg-black text-white min-h-screen p-10">
                Loading...
            </main>
        );

    }



    return (

        <main className="bg-black min-h-screen text-white p-10">


            <h1 className="text-4xl font-bold mb-10">
                Edit Guest
            </h1>



            <form
                onSubmit={updateGuest}
                className="max-w-xl space-y-5"
            >


                <input
                    value={guest.name || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        name: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Name"
                />



                <input
                    value={guest.phone || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        phone: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Phone"
                />



                <input
                    value={guest.email || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        email: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Email"
                />



                <input
                    value={guest.instagram || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        instagram: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Instagram"
                />



                <select
                    value={guest.vip_level || "Regular"}
                    onChange={(e) => setGuest({
                        ...guest,
                        vip_level: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                >

                    <option>Regular</option>
                    <option>VIP</option>
                    <option>BLACK</option>

                </select>



                <select
                    value={guest.tag || "Regular"}
                    onChange={(e) => setGuest({
                        ...guest,
                        tag: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                >

                    <option>Regular</option>
                    <option>VIP</option>
                    <option>BLACK</option>
                    <option>Influencer</option>
                    <option>Birthday</option>
                    <option>Artist</option>

                </select>



                <input
                    type="date"
                    value={guest.birthday || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        birthday: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                />



                <textarea
                    value={guest.notes || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        notes: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Notes"
                />



                <button
                    type="submit"
                    className="bg-blue-600 px-6 py-3 rounded-lg"
                >
                    Save Changes
                </button>


            </form>


        </main>

    );

}