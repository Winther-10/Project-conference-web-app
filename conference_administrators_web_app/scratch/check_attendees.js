import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAttendeeTable() {
  const { data, error } = await supabase
    .from('attendees')
    .select('count')
    .limit(1)
  
  console.log('Attendees table exists:', !error)

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .limit(100)
  
  const roles = [...new Set((userData || []).map(u => u.role))]
  console.log('Available roles in users table:', roles)
}

checkAttendeeTable()
