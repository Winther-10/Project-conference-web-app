
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('certificates', {
    public: true,
    allowedMimeTypes: ['application/pdf'],
    fileSizeLimit: 5242880 // 5MB
  })
  if (error) {
    if (error.message.includes('already exists')) console.log('Bucket already exists')
    else console.error('Error creating bucket:', error)
  } else {
    console.log('Bucket "certificates" created successfully')
  }
}

setupStorage()
