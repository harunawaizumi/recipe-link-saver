#!/usr/bin/env node

// Database initialization script for AWS RDS MySQL
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { pool, testConnection, executeQuery, closeConnection } = require('../config/database');

async function initializeDatabase() {
    console.log('🚀 Starting database initialization...');

    try {
        // Test database connection
        console.log('📡 Testing database connection...');
        const isConnected = await testConnection();

        if (!isConnected) {
            console.error('❌ Cannot connect to database. Please check your configuration.');
            process.exit(1);
        }

        // Read and execute schema file
        console.log('📄 Reading database schema...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSQL = await fs.readFile(schemaPath, 'utf8');

        // Split SQL statements and execute them
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log('🔧 Executing database schema...');
        for (const statement of statements) {
            if (statement.toUpperCase().startsWith('USE ') ||
                statement.toUpperCase().startsWith('CREATE DATABASE')) {
                // Skip USE and CREATE DATABASE statements for RDS
                continue;
            }

            try {
                await executeQuery(statement);
                console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
            } catch (error) {
                if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`⚠️  Table already exists, skipping...`);
                } else {
                    console.error(`❌ Error executing statement: ${error.message}`);
                    throw error;
                }
            }
        }

        // Verify table creation
        console.log('🔍 Verifying table structure...');
        const tables = await executeQuery('SHOW TABLES');
        console.log('📋 Created tables:', tables.map(row => Object.values(row)[0]));

        // Check recipes table structure
        const recipeTableInfo = await executeQuery('DESCRIBE recipes');
        console.log('📊 Recipes table structure:');
        recipeTableInfo.forEach(column => {
            console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
        });

        console.log('🎉 Database initialization completed successfully!');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    } finally {
        await closeConnection();
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };