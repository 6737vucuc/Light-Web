import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzqyucohnjtubivlmdkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cXl1Y29obmp0dWJpdmxtZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTQ5MTYsImV4cCI6MjA4NTEzMDkxNn0.IvCkw4rkAcDBRK4T-Ejst4TYS4WquCi-YV0gYv4YudY';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      events_per_second: 10,
    },
  },
});

// Admin client for server-side operations
export const getSupabaseAdmin = () => {
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cXl1Y29obmp0dWJpdmxtZGt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU1NDkxNiwiZXhwIjoyMDg1MTMwOTE2fQ.KuysYYr0faj9SwzYbKRC53apv7Y-BdR3JOwu8DmyulQ';
  return createClient(supabaseUrl, serviceRoleKey);
};
