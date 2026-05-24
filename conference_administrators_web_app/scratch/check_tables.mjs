import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cols, error } = await supabase
    .from('information_schema_columns')
    .select('table_name, column_name, data_type')
    .or('table_name.eq.downloads,table_name.eq.user_documents');
    
  if (error) {
    // If supabase doesn't expose information_schema_columns directly, let's try a custom RPC or raw SQL.
    // Wait, raw SQL might not be supported directly unless we have an RPC.
    // Let's try to query information_schema.columns via an RPC or query list columns.
    console.error('Error fetching columns via supabase query:', error);
  } else {
    console.log('Columns:', cols);
  }
}
check();
