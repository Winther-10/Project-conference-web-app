import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumn(columnName) {
  const { data, error } = await supabase.from('awards').select(columnName).limit(1);
  if (error) {
    console.log(`Column ${columnName}: FAILED (${error.message})`);
  } else {
    console.log(`Column ${columnName}: EXISTS`);
  }
}

async function main() {
  const columns = [
    'id', 'paper_id', 'paper_code', 'title', 'title_th', 'award_type', 'level', 'type',
    'university', 'authors', 'abstract', 'track', 'phase2_avg_score', 'announced_at',
    'certificate_url', 'prize_money', 'prize_description', 'advisor_certificate_url',
    'finalist_certificate_url', 'finalist_advisor_certificate_url', 'participant_certificate_url',
    'participant_advisor_certificate_url'
  ];

  console.log('Testing columns on "awards" table:');
  for (const col of columns) {
    await testColumn(col);
  }
}

main();
