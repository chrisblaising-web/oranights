"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
    const [unreadCount, setUnreadCount] = useState(0);

    async function loadUnreadCount() {
        const { count, error } = await supabase
            .from("sms_messages")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("direction", "inbound")
            .eq("is_read", false);

        if (error) {
            console.error(
                "Unable to load unread SMS count:",
                error
            );
            return;
        }

        setUnreadCount(count || 0);
    }

    useEffect(() => {
        void loadUnreadCount();

        const channel = supabase
            .channel("sidebar-sms-unread-count")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "sms_messages",
                },
                () => {
                    void loadUnreadCount();
                }
            )
            .subscribe();

        const refreshInterval = window.setInterval(() => {
            void loadUnreadCount();
        }, 5000);

        return () => {
            window.clearInterval(refreshInterval);
            void supabase.removeChannel(channel);
        };
    }, []);

    return (
        <aside className="flex min-h-screen w-64 flex-shrink-0 flex-col bg-zinc-950 p-6 text-white">
            <h1 className="mb-10 text-2xl font-bold">
                ORA CRM
            </h1>

            <nav className="space-y-5">
                <Link
                    href="/dashboard"
                    className="block transition hover:text-white/70"
                >
                    🏠 Dashboard
                </Link>

                <Link
                    href="/events"
                    className="block transition hover:text-white/70"
                >
                    📅 Events
                </Link>

                <Link
                    href="/host/check-in"
                    className="block rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                    ✅ Host Check-In
                </Link>

                <Link
                    href="/guests"
                    className="block transition hover:text-white/70"
                >
                    👥 Guests
                </Link>

                <Link
                    href="/add-guest"
                    className="block transition hover:text-white/70"
                >
                    ➕ Add Guest
                </Link>

                <Link
                    href="/forms"
                    className="block transition hover:text-white/70"
                >
                    📝 Campaign Forms
                </Link>

                <Link
                    href="/sms"
                    className="block transition hover:text-white/70"
                >
                    📲 SMS Campaigns
                </Link>

                <Link
                    href="/sms/inbox"
                    className="flex items-center justify-between gap-3 transition hover:text-white/70"
                >
                    <span>💬 Conversations</span>

                    {unreadCount > 0 && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                            {unreadCount > 99
                                ? "99+"
                                : unreadCount}
                        </span>
                    )}
                </Link>
            </nav>
        </aside>
    );
}