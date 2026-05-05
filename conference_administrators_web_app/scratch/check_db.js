import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  const { data, error } = await supabase
    .from('papers')
    .select('count')
    .limit(1)
  
  console.log('Papers table exists:', !error)
  
  const { error: roomError } = await supabase
    .from('presentation_rooms')
    .select('count')
    .limit(1)
  console.log('presentation_rooms table exists:', !roomError)

  const { error: scheduleError } = await supabase
    .from('presentation_schedule')
    .select('count')
    .limit(1)
  console.log('presentation_schedule table exists:', !scheduleError)
}

checkTables()
