// Verify the Supabase URL and key are using the SAME values
require('dotenv').config({ path: '.env' });

const url   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key   = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('Key prefix:', key?.substring(0, 30));
console.log('Key length:', key?.length);
