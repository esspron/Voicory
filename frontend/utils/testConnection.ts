import { supabase } from '../services/supabase';

export const testDatabaseConnection = async () => {
    console.log('🔍 Testing Supabase Database Connection...\n');
    
    try {
        // Test 1: Check if Supabase client is initialized
        console.log('✓ Supabase client initialized');
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        if (supabaseUrl) {
            console.log(`  URL: ${supabaseUrl}`);
        }
        
        // Test 2: Check authentication status
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.log('⚠ Authentication status: Not authenticated');
        } else {
            console.log(`✓ Authentication status: ${user ? 'Authenticated' : 'Anonymous'}`);
            if (user) {
                console.log(`  User ID: ${user.id}`);
                console.log(`  Email: ${user.email}`);
            }
        }
        
        // Test 3: Test customers table access
        console.log('\n📋 Testing customers table...');
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('count')
            .limit(1);
        
        if (customersError) {
            console.error('✗ Customers table error:', customersError.message);
            console.error('  Code:', customersError.code);
            console.error('  Details:', customersError.details);
            return false;
        } else {
            console.log('✓ Customers table accessible');
        }
        
        // Test 4: Fetch all customers
        const { data: allCustomers, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (fetchError) {
            console.error('✗ Error fetching customers:', fetchError.message);
            return false;
        } else {
            console.log(`✓ Successfully fetched ${allCustomers?.length || 0} customers`);
            if (allCustomers && allCustomers.length > 0) {
                console.log('\nSample customer:');
                console.log(JSON.stringify(allCustomers[0], null, 2));
            }
        }
        
        // Test 5: Test other tables
        console.log('\n📋 Testing other tables...');
        const tables = ['voices', 'assistants', 'phone_numbers', 'api_keys', 'callyy_call_logs'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('count')
                .limit(1);
            
            if (error) {
                console.log(`✗ ${table}: ${error.message}`);
            } else {
                console.log(`✓ ${table}: accessible`);
            }
        }
        
        console.log('\n✅ Database connection test completed!\n');
        return true;
        
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
};

// Auto-run in development (optional - can be imported manually)
export const autoTestConnection = () => {
    if (typeof window !== 'undefined') {
        setTimeout(() => {
            testDatabaseConnection();
        }, 2000);
    }
};
