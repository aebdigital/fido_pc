
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabaseUrl = env.REACT_APP_SUPABASE_URL;
const supabaseKey = env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPriceLists() {
    console.log('Fetching price lists...');
    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching price lists:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Found price list record. Keys:');
        console.log(Object.keys(data[0]));

        // Check specific columns we care about
        const columnsToCheck = [
            'others_vat_price',
            'work_auxiliary_and_finishing_price',
            'material_auxiliary_and_fastening_price'
        ];

        columnsToCheck.forEach(col => {
            console.log(`${col}: ${data[0][col]}`);
        });
    } else {
        console.log('No price lists found.');
    }
}

debugPriceLists();
