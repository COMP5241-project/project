import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Shared Supabase client. Uses the public anon key only — the service role
 * key must never appear in frontend code. `null` when the environment
 * variables are missing, in which case auth features are disabled.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

/** True when the Supabase environment variables are present. */
export const isSupabaseConfigured = supabase !== null
