#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('\n🔍 Checking Supabase configuration...\n');

const isPlaceholder = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized
    || normalized === 'https://your-project.supabase.co'
    || normalized === 'example'
    || normalized === 'changeme'
    || normalized.startsWith('your-');
};

let allValid = true;
const results = [];

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isSet = !isPlaceholder(value);

  if (isSet) {
    results.push(`✅ ${varName}`);
  } else {
    results.push(`❌ ${varName} - NOT SET or using placeholder`);
    allValid = false;
  }
});

results.forEach((r) => console.log(r));

console.log('\n' + '='.repeat(50));

if (allValid) {
  console.log('✅ Supabase environment is configured.');
  console.log('You can now run: npm start');
} else {
  console.log('❌ Configure the Supabase vars in .env before starting the app.');
}

console.log('='.repeat(50) + '\n');
process.exit(allValid ? 0 : 1);
