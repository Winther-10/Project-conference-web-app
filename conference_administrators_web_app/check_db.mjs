import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('papers').select('*').limit(1);
  if (error) console.error('Error fetching papers:', error);
  else console.log('Papers schema keys:', data && data.length > 0 ? Object.keys(data[0]) : 'No data in papers table');
  
  // also check system_settings or something else if papers is empty
}
check();
