const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;
let isSchemaReady = false;

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
    console.log('[TASKORA] Connected to Supabase at:', supabaseUrl);

    // Verify if *_taskora tables exist in Supabase
    supabase
      .from('profiles_taskora')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (!error) {
          isSchemaReady = true;
          console.log('[TASKORA] ✅ Supabase PostgreSQL schema (_taskora tables) is verified and active!');
        } else if (error.code === 'PGRST205') {
          isSchemaReady = false;
          console.log('\n========================================================================');
          console.log('[TASKORA] ⚠️  Notice: The "*_taskora" tables are not yet created in Supabase.');
          console.log('[TASKORA] 👉 Please run the SQL in your Supabase SQL Editor (supabase/schema.sql).');
          console.log('[TASKORA] Local persistence mode is active in the meantime so the app works seamlessly.');
          console.log('========================================================================\n');
        }
      })
      .catch(() => {});
  } catch (err) {
    console.warn('[TASKORA] Failed to initialize Supabase client:', err.message);
    isConfigured = false;
  }
} else {
  console.log('[TASKORA] Supabase credentials not set or set to placeholders. Running in resilient local persistence mode.');
}

module.exports = {
  supabase,
  isSupabaseConfigured: () => isConfigured && isSchemaReady,
  isSupabaseConnected: () => isConfigured,
  isSchemaReady: () => isSchemaReady
};
