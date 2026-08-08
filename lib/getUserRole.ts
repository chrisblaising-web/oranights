import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "host";

export async function getUserRole(): Promise<UserRole | null> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (error || !data) {
        return null;
    }

    return data.role as UserRole;
}