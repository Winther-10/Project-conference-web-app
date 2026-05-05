
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if RPC is not defined
  if (error) {
    // Try querying a common meta table
    const { data: tables, error: tablesError } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (tablesError) {
       console.log('Error listing tables:', tablesError.message);
    } else {
       console.log('Tables:', tables.map(t => t.table_name));
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
