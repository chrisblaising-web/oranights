import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default async function GuestProfile({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { data: guest, error } = await supabase
        .from("guests")
        .select("*")
        .eq("id", Number(id))
        .single();
    const { data: smsLogs } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("guest_id", Number(id))
        .order("created_at", { ascending: false });

    if (error || !guest) {
        return (
            <div className="flex">
                <Sidebar />

                <main className="flex-1 min-h-screen bg-black text-white p-10">
                    <h1 className="text-4xl font-bold">Guest Not Found</h1>

                    <Link
                        href="/guests"
                        className="inline-block mt-6 bg-white text-black px-5 py-3 rounded-lg"
                    >
                        ← Back to Guests
                    </Link>
                </main>
            </div>
        );
    }

    return (
        <div className="flex">
            <Sidebar />

            <main className="flex-1 min-h-screen bg-black text-white p-10">

                {/* Header */}

                <div className="flex justify-between items-center">

                    <div>
                        <h1 className="text-5xl font-bold">
                            {guest.name}
                        </h1>

                        <p className="text-zinc-400 mt-2">
                            Guest ID #{guest.id}
                        </p>
                    </div>

                    <div className="flex gap-3">

                        <Link
                            href="/guests"
                            className="bg-zinc-800 px-5 py-3 rounded-lg"
                        >
                            Back
                        </Link>

                        <Link
                            href={`/guests/${guest.id}/edit`}
                            className="bg-blue-600 px-5 py-3 rounded-lg"
                        >
                            Edit Guest
                        </Link>

                    </div>

                </div>

                {/* Personal Information */}

                <div className="mt-10 bg-zinc-900 rounded-xl p-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Personal Information
                    </h2>

                    <div className="grid grid-cols-2 gap-6">

                        <div>
                            <p className="text-zinc-400">Phone</p>
                            <p className="text-lg">{guest.phone || "-"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Email</p>
                            <p className="text-lg">{guest.email || "-"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Instagram</p>
                            <p className="text-lg">
                                {guest.instagram ? `@${guest.instagram}` : "-"}
                            </p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Birthday</p>
                            <p className="text-lg">{guest.birthday || "-"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">VIP Level</p>
                            <p className="text-lg">{guest.vip_level || "Regular"}</p>
                        </div>

                        <div>
                            <p className="text-zinc-400">Tag</p>
                            <p className="text-lg">{guest.tag || "Regular"}</p>
                        </div>

                    </div>

                </div>

                {/* Notes */}

                <div className="mt-8 bg-zinc-900 rounded-xl p-8">

                    <h2 className="text-2xl font-bold mb-4">
                        Notes
                    </h2>

                    <p className="text-zinc-300 whitespace-pre-wrap">
                        {guest.notes || "No notes added."}
                    </p>

                </div>

                {/* Quick Actions */}

                <div className="mt-8 bg-zinc-900 rounded-xl p-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Quick Actions
                    </h2>

                    <div className="flex flex-wrap gap-4">

                        <Link
                            href={`/guests/${guest.id}/edit`}
                            className="bg-blue-600 px-5 py-3 rounded-lg"
                        >
                            Edit Guest
                        </Link>

                        <Link
                            href="/sms"
                            className="bg-green-600 px-5 py-3 rounded-lg"
                        >
                            Send SMS
                        </Link>

                        <button
                            className="bg-purple-600 px-5 py-3 rounded-lg"
                        >
                            Create Reservation
                        </button>

                    </div>

                </div>

                {/* CRM Sections */}

                <div className="grid grid-cols-2 gap-8 mt-8">

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            Reservation History
                        </h2>

                        <p className="text-zinc-500">
                            No reservations yet.
                        </p>

                    </div>

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            SMS History
                        </h2>


                        {smsLogs && smsLogs.length > 0 ? (

                            <div className="space-y-4">

                                {smsLogs.map((sms: any) => (

                                    <div
                                        key={sms.id}
                                        className="border-b border-zinc-700 pb-4"
                                    >

                                        <h3 className="font-bold">
                                            {sms.campaign}
                                        </h3>


                                        <p className="text-zinc-400 mt-2">
                                            {sms.message}
                                        </p>


                                        <p className="text-green-400 mt-2">
                                            Status: {sms.status}
                                        </p>


                                        <p className="text-xs text-zinc-500 mt-2">
                                            {new Date(sms.created_at).toLocaleDateString()}
                                        </p>

                                    </div>

                                ))}

                            </div>

                        ) : (

                            <p className="text-zinc-500">
                                No SMS campaigns yet.
                            </p>

                        )}

                    </div>

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            Spending
                        </h2>

                        <p className="text-zinc-500">
                            Coming soon...
                        </p>

                    </div>

                    <div className="bg-zinc-900 rounded-xl p-8">

                        <h2 className="text-2xl font-bold mb-4">
                            Activity Timeline
                        </h2>

                        <p className="text-zinc-500">
                            Coming soon...
                        </p>

                    </div>

                </div>

            </main>
        </div>
    );
}