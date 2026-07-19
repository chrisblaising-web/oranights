import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GuestSearch from "@/components/GuestSearch";

export default async function Guests() {

    const { data: guests, error } = await supabase
        .from("guests")
        .select("*")
        .order("created_at", { ascending: false });


    if (error) {
        console.log(error);
    }


    return (

        <div className="flex">

            <Sidebar />


            <main className="flex-1 min-h-screen bg-black text-white p-10">


                <div className="flex justify-between items-center">

                    <h1 className="text-4xl font-bold">
                        Guests
                    </h1>


                    <Link
                        href="/add-guest"
                        className="bg-white text-black px-5 py-3 rounded-lg font-semibold"
                    >
                        + Add Guest
                    </Link>

                </div>


                <div className="mt-10">

                    <GuestSearch guests={guests ?? []} />

                </div>


            </main>

        </div>

    );
}