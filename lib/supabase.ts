import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lgbmlfdnfbotoayffhec.supabase.co";

const supabaseKey = "sb_publishable_V-v7B93s6DIfeIy0cqkOiA_8aHDTLnK";

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);