// Database configuration for AWS RDS MySQL
const mysql = require('mysql2/promise');

// Database configuration using environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recipe_link_saver',
    charset: 'utf8mb4',
    timezone: '+00:00',
    // Connection pool settings for better performance
    connectionLimit: 10,
    queueLimit: 0,
    // SSL configuration for AWS RDS
    ssl: {
        rejectUnauthorized: false
    }
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

// Close database connection pool
async function closeConnection() {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing database connection:', error.message);
    }
}

module.exports = {
    pool,
    testConnection,
    executeQuery,
    closeConnection,
    dbConfig
};