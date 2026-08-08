"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    getUserRole,
    type UserRole,
} from "@/lib/getUserRole";

type NavItem = {
    href: string;
    label: string;
    icon: string;
    highlight?: "green" | "blue";
    roles: UserRole[];
};

const navItems: NavItem[] = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: "🏠",
        roles: ["admin"],
    },
    {
        href: "/events",
        label: "Events",
        icon: "📅",
        highlight: "blue",
        roles: ["admin"],
    },
    {
        href: "/forms",
        label: "Campaign Forms",
        icon: "📝",
        roles: ["admin"],
    },
    {
        href: "/host/check-in",
        label: "Check-In & No-Shows",
        icon: "✅",
        highlight: "green",
        roles: ["admin", "host"],
    },
    {
        href: "/guests",
        label: "Guests",
        icon: "👥",
        roles: ["admin"],
    },
    {
        href: "/add-guest",
        label: "Add Guest",
        icon: "➕",
        roles: ["admin"],
    },
    {
        href: "/reservations",
        label: "Reservations",
        icon: "🍽️",
        roles: ["admin"],
    },
    {
        href: "/sms",
        label: "SMS Campaigns",
        icon: "📲",
        roles: ["admin"],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    const [role, setRole] =
        useState<UserRole | null>(null);

    const [roleLoading, setRoleLoading] =
        useState(true);

    const [unreadCount, setUnreadCount] =
        useState(0);

    const visibleNavItems = useMemo(() => {
        if (!role) {
            return [];
        }

        return navItems.filter((item) =>
            item.roles.includes(role)
        );
    }, [role]);

    useEffect(() => {
        let mounted = true;

        async function loadRole() {
            const currentRole =
                await getUserRole();

            if (!mounted) {
                return;
            }

            setRole(currentRole);
            setRoleLoading(false);
        }

        void loadRole();

        return () => {
            mounted = false;
        };
    }, []);

    async function loadUnreadCount() {
        if (role !== "admin") {
            setUnreadCount(0);
            return;
        }

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
        if (role !== "admin") {
            return;
        }

        void loadUnreadCount();

        const channel = supabase
            .channel(
                "sidebar-sms-unread-count"
            )
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

        const refreshInterval =
            window.setInterval(() => {
                void loadUnreadCount();
            }, 5000);

        return () => {
            window.clearInterval(
                refreshInterval
            );

            void supabase.removeChannel(
                channel
            );
        };
    }, [role]);

    function isActive(href: string) {
        return (
            pathname === href ||
            pathname.startsWith(
                `${href}/`
            )
        );
    }

    function navClass(item: NavItem) {
        const active = isActive(item.href);

        if (
            item.highlight === "green"
        ) {
            return active
                ? "block rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-3 font-semibold text-emerald-200"
                : "block rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/20";
        }

        if (
            item.highlight === "blue"
        ) {
            return active
                ? "block rounded-xl border border-blue-400/40 bg-blue-500/20 px-3 py-3 font-semibold text-blue-200"
                : "block rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-3 font-semibold text-blue-300 transition hover:bg-blue-500/15";
        }

        return active
            ? "block rounded-xl bg-white px-3 py-3 font-semibold text-black"
            : "block rounded-xl px-3 py-3 transition hover:bg-white/5 hover:text-white";
    }

    return (
        <aside className="flex min-h-screen w-64 flex-shrink-0 flex-col border-r border-white/5 bg-zinc-950 p-6 text-white">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">
                    ORA CRM
                </h1>

                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Event Operations
                </p>

                {!roleLoading && role && (
                    <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium capitalize text-zinc-400">
                        {role}
                    </p>
                )}
            </div>

            <nav className="space-y-2">
                {roleLoading ? (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-sm text-zinc-500">
                        Loading access...
                    </div>
                ) : (
                    visibleNavItems.map(
                        (item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={navClass(
                                    item
                                )}
                            >
                                <span className="mr-2">
                                    {item.icon}
                                </span>

                                {item.label}
                            </Link>
                        )
                    )
                )}

                {role === "admin" && (
                    <Link
                        href="/sms/inbox"
                        className={
                            isActive("/sms/inbox")
                                ? "flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 font-semibold text-black"
                                : "flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5 hover:text-white"
                        }
                    >
                        <span>
                            💬 Conversations
                        </span>

                        {unreadCount > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                                {unreadCount >
                                    99
                                    ? "99+"
                                    : unreadCount}
                            </span>
                        )}
                    </Link>
                )}
            </nav>

            <div className="mt-auto pt-8">
                <div className="rounded-xl border border-white/10 bg-black p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Main workflow
                    </p>

                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {role === "host"
                            ? "Guest Search → Check-In → Walk-In → No-Show Report"
                            : "Event → Form → Guest List → Reservation → Check-In → No-Show Report"}
                    </p>
                </div>
            </div>
        </aside>
    );
}