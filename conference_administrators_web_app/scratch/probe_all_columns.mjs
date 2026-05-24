import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const testUserId = '14750d3f-2145-4861-811f-ece03ff9b3ec';
  console.log("Inserting a temp row into user_documents...");
  const { data, error } = await supabase.from('user_documents').insert({
    user_id: testUserId,
    title_th: 'TEMP_PROBE',
    title_en: 'TEMP_PROBE',
    file_url: 'https://example.com/temp.pdf',
    document_type: 'other'
  }).select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted! Row columns:', Object.keys(data[0]), data[0]);
    
    // Now delete it
    const { error: delError } = await supabase.from('user_documents').delete().eq('id', data[0].id);
    if (delError) console.error('Delete error:', delError);
    else console.log('Successfully cleaned up!');
  }
}

run();
