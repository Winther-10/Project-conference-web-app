const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

async function run() {
  const tables = ['user_documents', 'downloads'];
  for (const table of tables) {
    const url = `${supabaseUrl}/rest/v1/${table}`;
    console.log(`Sending OPTIONS request to: ${url}`);
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('Status:', response.status);
    console.log('Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    const text = await response.text();
    console.log('Body:', text);
    console.log('-----------------------------');
  }
}

run();
