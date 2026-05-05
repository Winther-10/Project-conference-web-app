
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCommonTables() {
  const tables = ['settings', 'config', 'system_configs', 'conference_info'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table '${table}' exists and has data:`, data);
    } else if (error.code !== '42P01') { // 42P01 is "undefined_table"
      console.log(`Table '${table}' might exist but returned error:`, error.message);
    }
  }
}

checkCommonTables();
