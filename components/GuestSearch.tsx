"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function GuestSearch({ guests = [] }: any) {

    const [search, setSearch] = useState("");
    const [guestList, setGuestList] = useState(guests);


    const filteredGuests = guestList.filter((guest: any) =>
        guest.name?.toLowerCase().includes(search.toLowerCase()) ||
        guest.phone?.includes(search) ||
        guest.instagram?.toLowerCase().includes(search.toLowerCase())
    );


    async function deleteGuest(id: number) {

        const confirmDelete = confirm("Delete this guest?");

        if (!confirmDelete) return;


        const { error } = await supabase
            .from("guests")
            .delete()
            .eq("id", id);


        if (!error) {

            setGuestList(
                guestList.filter((guest: any) => guest.id !== id)
            );

        }

    }



    return (
        <>

            <input
                placeholder="Search guests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 p-4 rounded-lg outline-none"
            />


            <div className="mt-8 bg-zinc-900 rounded-xl overflow-hidden">

                <table className="w-full">

                    <thead>

                        <tr className="text-left border-b border-zinc-700">

                            <th className="p-5">
                                Name
                            </th>

                            <th className="p-5">
                                Phone
                            </th>

                            <th className="p-5">
                                VIP Level
                            </th>

                            <th className="p-5">
                                Instagram
                            </th>

                            <th className="p-5">
                                Actions
                            </th>

                        </tr>

                    </thead>



                    <tbody>


                        {filteredGuests.map((guest: any) => (

                            <tr
                                key={guest.id}
                                className="border-b border-zinc-800"
                            >


                                <td className="p-5">
                                    {guest.name}
                                </td>


                                <td className="p-5">
                                    {guest.phone}
                                </td>


                                <td className="p-5">
                                    {guest.vip_level}
                                </td>


                                <td className="p-5">
                                    @{guest.instagram}
                                </td>


                                <td className="p-5 flex gap-2">


                                    <Link
                                        href={`/guests/${guest.id}`}
                                        className="bg-zinc-700 px-3 py-2 rounded"
                                    >
                                        View
                                    </Link>


                                    <Link
                                        href={`/guests/${guest.id}/edit`}
                                        className="bg-blue-600 px-3 py-2 rounded"
                                    >
                                        Edit
                                    </Link>


                                    <button
                                        onClick={() => deleteGuest(guest.id)}
                                        className="bg-red-600 px-3 py-2 rounded"
                                    >
                                        Delete
                                    </button>


                                </td>


                            </tr>

                        ))}


                    </tbody>


                </table>


            </div>

        </>
    );
}