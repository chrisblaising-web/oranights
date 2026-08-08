// lib/requireAdmin.ts

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export async function requireAdmin(nextPath = "/dashboard") {
    const cookieStore = await cookies();

    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration.");
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const {
                            name,
                            value,
                            options,
                        } of cookiesToSet) {
                            cookieStore.set(
                                name,
                                value,
                                options
                            );
                        }
                    } catch {
                        // Server components cannot always set cookies.
                    }
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(
            `/login?next=${encodeURIComponent(
                nextPath
            )}`
        );
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        redirect("/host/check-in");
    }

    return {
        supabase,
        user,
    };
}