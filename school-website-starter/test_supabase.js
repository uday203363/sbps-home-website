const { createClient } = require('@supabase/supabase-js');
const path = require('path');
// Load environment variables from local .env
require('dotenv').config();

let supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY;

if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length - 9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length - 8);
}

console.log('--- Config Check ---');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('\n--- 1. Testing Admins Select ---');
    const { data: admins, error: adminErr } = await supabase
      .from('admins')
      .select('*')
      .limit(1);
    
    if (adminErr) {
      console.error('Admins Select Error:', adminErr.message || adminErr);
    } else {
      console.log('Admins Data:', admins);
    }

    console.log('\n--- 2. Testing Inquiries Select ---');
    const { data: inquiries, error: inqSelErr } = await supabase
      .from('inquiries')
      .select('*')
      .limit(1);
    
    if (inqSelErr) {
      console.error('Inquiries Select Error:', inqSelErr.message || inqSelErr);
    } else {
      console.log('Inquiries Select Data:', inquiries);
    }

    console.log('\n--- 3. Testing Inquiries Insert ---');
    const { data: inserted, error: inqInsErr } = await supabase
      .from('inquiries')
      .insert({
        name: 'Test Entry',
        phone: '1234567890',
        email: 'test@example.com',
        grade: 'Class I',
        message: 'This is a test insertion from script',
        type: 'Admission Inquiry'
      })
      .select();

    if (inqInsErr) {
      console.error('Inquiries Insert Error:', inqInsErr.message || inqInsErr);
    } else {
      console.log('Inquiries Insert Data:', inserted);
    }
  } catch (err) {
    console.error('Caught Exception:', err);
  }
}

test();
