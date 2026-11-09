const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;

// Check if credentials are valid URL and not default placeholder
if (
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseKey.includes('your_supabase')
) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    isConfigured = true;
    console.log('[TASKORA] Connected to Supabase PostgreSQL at:', supabaseUrl);
  } catch (err) {
    console.warn('[TASKORA] Failed to initialize Supabase client:', err.message);
    isConfigured = false;
  }
} else {
  console.log('[TASKORA] Supabase credentials not set or set to placeholders. Running in resilient local persistence mode.');
}

module.exports = {
  supabase,
  isSupabaseConfigured: () => isConfigured
};
