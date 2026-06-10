// src/supabaseClient.js
// Re-exports the shared Supabase singleton from supabase.ts so that
// Auth.tsx and App.tsx always use the SAME client instance.
// This ensures auth events (SIGNED_IN / SIGNED_OUT) fire on the
// same listener that App.tsx's onAuthStateChange is subscribed to.
export { supabase } from './supabase.ts';
