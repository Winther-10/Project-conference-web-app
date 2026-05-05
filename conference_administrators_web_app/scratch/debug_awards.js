
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function debugAwards() {
  const { data, error } = await supabase.from('awards').select('*').limit(1)
  if (error) {
    console.error('Error fetching awards:', error.message)
  } else {
    console.log('Awards sample data:', data)
    // Try to get table info
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'awards' })
    if (colError) console.log('RPC get_table_columns failed (expected if not defined)')
    else console.log('Awards Columns:', cols)
  }
}

debugAwards()
