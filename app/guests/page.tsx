<<<<<<< HEAD
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import GuestSearch from "@/components/GuestSearch";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
    const { data: guests, error } = await supabase
        .from("guests")
        .select(`
      id,
      created_at,
      name,
      phone,
      email,
      instagram,
      gender,
      vip_level,
      tag,
      notes
    `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Guest loading error:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });

        return (
            <div className="flex min-h-screen bg-black text-white">
                <Sidebar />

                <main className="flex-1 p-6 sm:p-10">
                    <div className="rounded-xl border border-red-800 bg-red-950/40 p-5">
                        <h1 className="text-xl font-bold text-red-300">
                            Could not load guests
                        </h1>

                        <p className="mt-2 text-sm text-red-200">
                            {error.message}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    const guestCount = guests?.length ?? 0;

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="min-h-screen flex-1 p-6 sm:p-10">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold sm:text-4xl">
                                Guests
                            </h1>

                            <p className="mt-2 text-sm text-zinc-400">
                                {guestCount} {guestCount === 1 ? "guest" : "guests"} in your CRM
                            </p>
                        </div>

                        <Link
                            href="/add-guest"
                            className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-black transition hover:bg-zinc-200"
                        >
                            + Add Guest
                        </Link>
                    </div>

                    <div className="mt-10">
                        <GuestSearch guests={guests ?? []} />
                    </div>
                </div>
            </main>
        </div>
=======
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

>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152
    );
}