const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTables() {
  console.log("Checking ingredients table...");
  const { data: iData, error: iErr } = await supabase.from('ingredients').select('*').limit(1);
  if (iErr) {
    console.log("ingredients error:", iErr.message);
  } else {
    console.log("ingredients exists. Data:", iData);
  }

  console.log("Checking stock_logs table...");
  const { data: sData, error: sErr } = await supabase.from('stock_logs').select('*').limit(1);
  if (sErr) {
    console.log("stock_logs error:", sErr.message);
  } else {
    console.log("stock_logs exists. Data:", sData);
  }
}

checkTables();
