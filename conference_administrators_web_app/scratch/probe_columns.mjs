import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  // Let's first fetch all users to get a valid user_id
  const { data: users } = await supabase.from('users').select('user_id').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found to test');
    return;
  }
  const testUserId = users[0].user_id;
  console.log('Testing with user_id:', testUserId);

  // Test columns list
  const colsToTest = ['paper_code', 'paper_id', 'article_ref', 'article_code'];
  
  for (const col of colsToTest) {
    const insertObj = {
      user_id: testUserId,
      title_th: 'Test Probe ' + col,
      title_en: 'Test Probe ' + col,
      file_url: 'https://example.com/test.pdf',
      document_type: 'other'
    };
    insertObj[col] = 'TEST-001';
    
    const { data, error } = await supabase.from('user_documents').insert(insertObj).select();
    if (error) {
      console.log(`Column '${col}' failed:`, error.message);
    } else {
      console.log(`Column '${col}' EXISTS and insert succeeded!`);
      // Delete test row
      await supabase.from('user_documents').delete().eq('id', data[0].id);
    }
  }
}

probe();
