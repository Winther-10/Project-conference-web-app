import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function run() {
  const email = 'admin3@gmail.com';
  const password = '123456';
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  console.log('SUCCESS! Logged in as:', authData.user.id);
  
  console.log('Trying to insert document for self using same client...');
  const { data: insertData, error: insertError } = await supabase.from('user_documents').insert({
    user_id: authData.user.id,
    title_th: 'TEMP_PROBE',
    title_en: 'TEMP_PROBE',
    file_url: 'https://example.com/temp.pdf',
    document_type: 'other'
  }).select();

  if (insertError) {
    console.error('Insert error:', insertError);
  } else {
    console.log('Insert success! Columns:', Object.keys(insertData[0]), insertData[0]);
    // Clean up
    await supabase.from('user_documents').delete().eq('id', insertData[0].id);
    console.log('Cleaned up temp row.');
  }
}

run();
