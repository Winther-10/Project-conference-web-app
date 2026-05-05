
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function testUpdate() {
  const { error } = await supabase.from('awards').update({ certificate_url: 'test' }).match({ id: -1 })
  if (error && error.message.includes('column "certificate_url" does not exist')) {
    console.log('Column "certificate_url" MISSING')
  } else if (error) {
    console.log('Other error (maybe column exists but ID -1 not found):', error.message)
  } else {
    console.log('Column "certificate_url" EXISTS')
  }
}

testUpdate()
