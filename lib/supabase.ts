<<<<<<< HEAD
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
=======
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lgbmlfdnfbotoayffhec.supabase.co";

const supabaseKey = "sb_publishable_V-v7B93s6DIfeIy0cqkOiA_8aHDTLnK";

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152
);