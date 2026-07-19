import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default async function Dashboard() {

    const { count: totalGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true });


    const { count: vipGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .neq("vip_level", "Regular");


    return (

        <div className="flex">

            <Sidebar />


            <main className="flex-1 min-h-screen bg-black text-white p-10 relative z-0">


                <div className="flex justify-between items-center">


                    <h1 className="text-4xl font-bold">
                        ORA Dashboard
                    </h1>


                    <Link
                        href="/add-guest"
                        className="relative z-20 inline-block bg-white text-black px-6 py-3 rounded-lg font-bold cursor-pointer"
                    >
                        Add Guest
                    </Link>


                </div>



                <div className="grid grid-cols-4 gap-6 mt-10">


                    <div className="bg-zinc-900 p-6 rounded-xl">

                        <h2 className="text-gray-400">
                            Total Guests
                        </h2>

                        <p className="text-4xl font-bold mt-2">
                            {totalGuests ?? 0}
                        </p>

                    </div>



                    <div className="bg-zinc-900 p-6 rounded-xl">

                        <h2 className="text-gray-400">
                            VIP Members
                        </h2>

                        <p className="text-4xl font-bold mt-2">
                            {vipGuests ?? 0}
                        </p>

                    </div>



                    <div className="bg-zinc-900 p-6 rounded-xl">

                        <h2 className="text-gray-400">
                            Reservations
                        </h2>

                        <p className="text-4xl font-bold mt-2">
                            0
                        </p>

                    </div>



                    <div className="bg-zinc-900 p-6 rounded-xl">

                        <h2 className="text-gray-400">
                            Revenue
                        </h2>

                        <p className="text-4xl font-bold mt-2">
                            $0
                        </p>

                    </div>


                </div>


            </main>

        </div>

    );
}