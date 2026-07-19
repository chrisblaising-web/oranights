import Link from "next/link";

export default function Sidebar() {

    return (
        <aside className="w-64 min-h-screen bg-zinc-950 text-white p-6 flex-shrink-0">

            <h1 className="text-2xl font-bold mb-10">
                ORA CRM
            </h1>

            <nav className="space-y-5">

                <Link
                    href="/dashboard"
                    className="block"
                >
                    🏠 Dashboard
                </Link>


                <Link
                    href="/guests"
                    className="block"
                >
                    👥 Guests
                </Link>


                <Link
                    href="/add-guest"
                    className="block"
                >
                    ➕ Add Guest
                </Link>
                <Link
                    href="/sms"
                    className="block"
                >
                    📲 SMS Campaigns
                </Link>

            </nav>

        </aside>
    );
}