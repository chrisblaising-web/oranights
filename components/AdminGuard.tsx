"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/getUserRole";

export default function AdminGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const [loading, setLoading] =
        useState(true);

    const [allowed, setAllowed] =
        useState(false);

    useEffect(() => {
        let mounted = true;

        async function checkAccess() {
            const role =
                await getUserRole();

            if (!mounted) {
                return;
            }

            if (role !== "admin") {
                router.replace(
                    "/host/check-in"
                );
                return;
            }

            setAllowed(true);
            setLoading(false);
        }

        void checkAccess();

        return () => {
            mounted = false;
        };
    }, [router]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <p className="text-sm text-zinc-400">
                    Checking access...
                </p>
            </main>
        );
    }

    if (!allowed) {
        return null;
    }

    return <>{children}</>;
}