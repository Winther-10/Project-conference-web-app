import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking paper_authors table...");
  const { data: authors, error: err1 } = await supabase.from('paper_authors').select('*').limit(1);
  if (err1) console.error('Error fetching paper_authors:', err1);
  else console.log('paper_authors columns:', authors && authors.length > 0 ? Object.keys(authors[0]) : 'No data');

  console.log("Checking users table...");
  const { data: users, error: err2 } = await supabase.from('users').select('*').limit(1);
  if (err2) console.error('Error fetching users:', err2);
  else console.log('users columns:', users && users.length > 0 ? Object.keys(users[0]) : 'No data');

  console.log("Checking papers table...");
  const { data: papers, error: err3 } = await supabase.from('papers').select('*').limit(1);
  if (err3) console.error('Error fetching papers:', err3);
  else console.log('papers columns:', papers && papers.length > 0 ? Object.keys(papers[0]) : 'No data');
}
check();
