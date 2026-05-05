require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://eczfppxlflhqbvcxheeh.supabase.co',
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'
);

async function checkNews() {
  const { data, error } = await supabase.from('news').select('*');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

checkNews();
