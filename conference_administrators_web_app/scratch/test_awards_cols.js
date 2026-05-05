
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function testInsert() {
  const fields = ['paper_id', 'paper_code', 'title_th', 'award_type', 'phase2_avg_score', 'announced_at', 'certificate_url'];
  for (const field of fields) {
    const obj = { [field]: 'test' };
    if (field === 'paper_id') obj[field] = '00000000-0000-0000-0000-000000000000';
    if (field === 'phase2_avg_score') obj[field] = 0;
    
    const { error } = await supabase.from('awards').insert(obj)
    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      console.log(`Column "${field}" DOES NOT EXIST`)
    } else if (error) {
       console.log(`Column "${field}" error:`, error.message)
    } else {
       console.log(`Column "${field}" MIGHT EXIST (or insert failed for other reason)`)
    }
  }
}

testInsert()
