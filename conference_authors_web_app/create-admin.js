import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  const email = 'admin.icsci@gmail.com';
  const password = 'AdminPassword123!';

  console.log(`Creating admin user: ${email}...`);

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        first_name_th: 'ผู้ดูแลระบบ',
        last_name_th: 'ระบบงานประชุม',
        first_name_en: 'System',
        last_name_en: 'Administrator',
      }
    }
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('User already exists, attempting to log in to get user ID...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (signInError) {
        console.error('Error signing in:', signInError);
        return;
      }
      data.user = signInData.user;
    } else {
      console.error('Error creating user:', error);
      return;
    }
  }

  const userId = data.user.id;
  console.log(`User created/logged in with ID: ${userId}`);

  console.log('Updating role to admin in users table...');
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Failed to update user role to admin. You may need to update it manually via Supabase dashboard due to RLS policies.', updateError);
    // Alternatively try upsert
    console.log('Trying upsert...');
    const { error: upsertError } = await supabase.from('users').upsert({
      user_id: userId,
      email: email,
      role: 'admin',
      first_name_th: 'ผู้ดูแลระบบ',
      last_name_th: 'ระบบงานประชุม',
      first_name_en: 'System',
      last_name_en: 'Administrator',
    });
    if (upsertError) {
       console.error('Upsert also failed:', upsertError);
    } else {
       console.log('Upsert succeeded! User role is admin.');
    }
  } else {
    console.log('Successfully updated user role to admin!');
  }

  console.log('\n=============================================');
  console.log('Admin Account Created:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('=============================================');
}

createAdmin();
