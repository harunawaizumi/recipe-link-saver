// Database connection test utility
require('dotenv').config();
const { testConnection, executeQuery, closeConnection } = require('../config/database');

async function runDatabaseTests() {
    console.log('🧪 Running database connection tests...\n');

    try {
        // Test 1: Basic connection
        console.log('Test 1: Basic Connection');
        const isConnected = await testConnection();
        console.log(`Result: ${isConnected ? '✅ PASS' : '❌ FAIL'}\n`);

        if (!isConnected) {
            console.log('❌ Cannot proceed with other tests due to connection failure');
            return false;
        }

        // Test 2: Check if recipes table exists
        console.log('Test 2: Check recipes table existence');
        try {
            const tables = await executeQuery("SHOW TABLES LIKE 'recipes'");
            const tableExists = tables.length > 0;
            console.log(`Result: ${tableExists ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`Tables found: ${tables.length}\n`);
        } catch (error) {
            console.log(`Result: ❌ FAIL - ${error.message}\n`);
        }

        // Test 3: Check table structure
        console.log('Test 3: Verify table structure');
        try {
            const columns = await executeQuery('DESCRIBE recipes');
            console.log('✅ PASS - Table structure:');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
            console.log('');
        } catch (error) {
            console.log(`Result: ❌ FAIL - ${error.message}\n`);
        }

        // Test 4: Test basic CRUD operations
        console.log('Test 4: Basic CRUD operations');
        try {
            // Insert test record
            const testId = 'test-' + Date.now();
            await executeQuery(
                'INSERT INTO recipes (id, url, title, domain, memo, rating) VALUES (?, ?, ?, ?, ?, ?)',
                [testId, 'https://test.com/recipe', 'Test Recipe', 'test.com', 'Test memo', '未定']
            );
            console.log('✅ INSERT operation successful');

            // Select test record
            const selectResult = await executeQuery('SELECT * FROM recipes WHERE id = ?', [testId]);
            console.log(`✅ SELECT operation successful - Found ${selectResult.length} record(s)`);

            // Update test record
            await executeQuery(
                'UPDATE recipes SET memo = ?, rating = ? WHERE id = ?',
                ['Updated test memo', '満足', testId]
            );
            console.log('✅ UPDATE operation successful');

            // Delete test record
            await executeQuery('DELETE FROM recipes WHERE id = ?', [testId]);
            console.log('✅ DELETE operation successful');

            console.log('Result: ✅ PASS - All CRUD operations working\n');
        } catch (error) {
            console.log(`Result: ❌ FAIL - ${error.message}\n`);
        }

        // Test 5: Check indexes
        console.log('Test 5: Check database indexes');
        try {
            const indexes = await executeQuery('SHOW INDEX FROM recipes');
            console.log('✅ PASS - Database indexes:');
            indexes.forEach(idx => {
                console.log(`  - ${idx.Key_name} on ${idx.Column_name}`);
            });
            console.log('');
        } catch (error) {
            console.log(`Result: ❌ FAIL - ${error.message}\n`);
        }

        console.log('🎉 Database tests completed!');
        return true;

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        return false;
    } finally {
        await closeConnection();
    }
}

// Run tests if called directly
if (require.main === module) {
    runDatabaseTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { runDatabaseTests };