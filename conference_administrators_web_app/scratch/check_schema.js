
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function checkSchema() {
  const { data, error } = await supabase.from('papers').select('*').limit(1)
  if (error) console.error(error)
  else console.log('Papers columns:', Object.keys(data[0] || {}))

  const { data: awards } = await supabase.from('awards').select('*').limit(1)
  console.log('Awards columns:', Object.keys(awards[0] || {}))
}

checkSchema()
