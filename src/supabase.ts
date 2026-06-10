/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — supabase-js types are resolved at runtime via vite/client
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseUrl: string = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const isConfigValid =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

// Typed as any-db client so Supabase .from() chains don't infer `never`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: SupabaseClient<any, 'public', any> | null = null;
let isSupabaseEnabled = false;

if (isConfigValid) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    isSupabaseEnabled = true;
    console.log('Loopzy: Supabase connection established.');
  } catch (error) {
    console.warn('Loopzy: Could not establish Supabase connection:', error);
  }
} else {
  console.log('Loopzy: Running in LocalStorage mode. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.');
}

export { supabase, isSupabaseEnabled };
