const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's get a paper first to get a valid paper_id and paper_code
  const { data: papers, error: pErr } = await supabase.from('papers').select('paper_id, paper_code, title_th').limit(1);
  if (pErr || !papers || papers.length === 0) {
    console.error('No papers found:', pErr);
    return;
  }
  const paper = papers[0];
  console.log('Using paper:', paper);

  // Try to insert a record into awards
  const insertData = {
    paper_id: paper.paper_id,
    paper_code: paper.paper_code,
    title: paper.title_th || 'test',
    title_th: paper.title_th || 'test',
    award_type: 'champion',
    level: 'excellent',
    type: 'poster',
    university: 'test uni',
    authors: ['author 1'],
    abstract: 'test abstract',
    track: 'test track',
    phase2_avg_score: 95,
    announced_at: new Date().toISOString()
  };

  const { data: inserted, error: iErr } = await supabase.from('awards').insert(insertData).select();
  if (iErr) {
    console.error('Error inserting award:', iErr);
  } else {
    console.log('Inserted award:', inserted);
    // Delete it
    const { error: dErr } = await supabase.from('awards').delete().eq('id', inserted[0].id);
    console.log('Deleted test record. Error?', dErr);
  }
}

run();
