/**
 * Supabase Client Configuration
 * ISO 27001 A.9 - Access Control
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('Missing:', {
    VITE_SUPABASE_URL: !supabaseUrl ? '❌ NOT SET' : '✓',
    VITE_SUPABASE_ANON_KEY: !supabaseAnonKey ? '❌ NOT SET' : '✓',
  });
  console.error('');
  console.error('📝 TO FIX:');
  console.error('1. Go to Vercel Dashboard → Settings → Environment Variables');
  console.error('2. Add: VITE_SUPABASE_URL=https://njcancswtqnxihxavshl.supabase.co');
  console.error('3. Add: VITE_SUPABASE_ANON_KEY=<your-anon-key-from-supabase>');
  console.error('4. Redeploy or commit a change to trigger rebuild');
  console.error('');
  console.error('⚠️ Using placeholder values - authentication will NOT work!');
}

// Use placeholder values if env vars are missing (prevents app crash)
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
