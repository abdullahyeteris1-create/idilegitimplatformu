import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null | undefined;

function hasValidSupabaseUrl(): boolean {
  if (!supabaseUrl || supabaseUrl.includes("BURAYA_")) {
    return false;
  }

  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function hasSupabaseEnv(): boolean {
  if (!supabaseAnonKey || supabaseAnonKey.includes("BURAYA_")) {
    return false;
  }

  return hasValidSupabaseUrl();
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient !== undefined) {
    return browserClient;
  }

  if (!hasSupabaseEnv()) {
    browserClient = null;

    if (process.env.NODE_ENV === "development") {
      console.warn("Supabase env variables are missing. Falling back without Supabase client.");
    }

    return browserClient;
  }

  browserClient = createClient(supabaseUrl as string, supabaseAnonKey as string);
  return browserClient;
}

export const supabase = typeof window === "undefined" ? null : getSupabaseBrowserClient();
