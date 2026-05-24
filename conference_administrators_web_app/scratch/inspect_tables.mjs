import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    console.log("Fetching a row from downloads...");
    const { data: downloads, error: err1 } = await supabase.from('downloads').select('*').limit(1);
    if (err1) console.error('Error downloads:', err1);
    else console.log('downloads columns:', downloads && downloads.length > 0 ? Object.keys(downloads[0]) : 'No data', downloads);
  } catch (e) {
    console.error('Error in downloads fetch:', e);
  }

  try {
    console.log("Fetching a row from user_documents...");
    const { data: userDocs, error: err2 } = await supabase.from('user_documents').select('*').limit(1);
    if (err2) console.error('Error user_documents:', err2);
    else console.log('user_documents columns:', userDocs && userDocs.length > 0 ? Object.keys(userDocs[0]) : 'No data', userDocs);
  } catch (e) {
    console.error('Error in user_documents fetch:', e);
  }

  try {
    // If no data, let's fetch OpenAPI spec definitions
    const url = `${supabaseUrl}/rest/v1/`;
    console.log('Fetching OpenAPI spec from:', url);
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('OpenAPI response status:', response.status);
    if (response.ok) {
      const spec = await response.json();
      console.log('user_documents properties:', Object.keys(spec.definitions?.user_documents?.properties || {}));
      console.log('downloads properties:', Object.keys(spec.definitions?.downloads?.properties || {}));
    } else {
      console.error('Failed to fetch:', response.statusText, await response.text());
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

inspect();
