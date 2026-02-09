'use client';

import { createClient } from '@supabase/supabase-js';

// Browser-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: false, // We use JWT auth instead
  },
});

// Helper to create authenticated client with JWT
export const createAuthenticatedClient = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Server-side admin client (for backward compatibility)
// Note: This should only be used in server-side code
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    console.warn('getSupabaseAdmin should not be called on client side');
    return supabase;
  }
  
  // Return regular client - admin operations should use server.ts instead
  return supabase;
};
