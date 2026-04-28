const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUsers() {
  const users = [
    {
      email: 'admin@aceclub.in',
      password: 'AdminPassword123!',
      full_name: 'Super Admin',
      role: 'admin'
    },
    {
      email: 'student@aceclub.in',
      password: 'StudentPassword123!',
      full_name: 'Test Student',
      role: 'student'
    }
  ];

  for (const userData of users) {
    console.log(`Creating user: ${userData.email}...`);
    
    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: { full_name: userData.full_name }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`User ${userData.email} already exists in Auth.`);
        // Try to get the user id
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers.users.find(u => u.email === userData.email);
        if (user) {
           await updateProfile(user.id, userData);
        }
      } else {
        console.error(`Error creating ${userData.email}:`, authError.message);
      }
      continue;
    }

    if (authData.user) {
      await updateProfile(authData.user.id, userData);
    }
  }
}

async function updateProfile(id, userData) {
  console.log(`Updating profile for ${userData.email}...`);
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role
    });

  if (profileError) {
    console.error(`Error updating profile for ${userData.email}:`, profileError.message);
  } else {
    console.log(`Successfully set up ${userData.email} as ${userData.role}`);
  }
}

createTestUsers();
