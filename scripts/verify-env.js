#!/usr/bin/env node

require('dotenv').config();

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('\n🔍 Checking Supabase configuration...\n');

const placeholderValues = new Set([
  'https://your-project.supabase.co',
  'your-anon-key',
  'your-service-role-key',
  'example',
  'changeme'
]);

let allValid = true;
const results = [];

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isSet = !!value && !placeholderValues.has(String(value).trim().toLowerCase());

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
