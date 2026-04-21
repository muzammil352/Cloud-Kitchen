const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log("Checking reorder_level column in ingredients table...");
  const { error } = await supabase.from('ingredients').select('reorder_level').limit(1);
  if (error) {
    console.log("Error querying reorder_level:", error.message);
  } else {
    console.log("Column reorder_level exists!");
  }
}

check();
