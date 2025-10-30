# Recipe Link Saver - Database Setup

This document describes the AWS RDS MySQL database setup for the Recipe Link Saver application.

## Overview

The application uses AWS RDS MySQL as the primary database to store recipe links, metadata, and user preferences. The database is designed to be scalable, secure, and highly available.

## Database Schema

### Recipes Table
The main table that stores all recipe information:

```sql
CREATE TABLE recipes (
    id VARCHAR(36) PRIMARY KEY,           -- Unique identifier (UUID)
    url VARCHAR(2048) NOT NULL,           -- Recipe URL
    title VARCHAR(255),                   -- Recipe title
    domain VARCHAR(255),                  -- Domain name for grouping
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When recipe was added
    memo TEXT,                           -- User's personal notes
    rating ENUM('未定', '微妙', 'まあまあ', '満足', '絶対リピ！') DEFAULT '未定',  -- User rating
    image_url VARCHAR(2048),             -- Recipe image URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_date_added`: For sorting by date
- `idx_domain`: For grouping by domain
- `idx_rating`: For filtering by rating
- `idx_url_hash`: For URL lookups

## Environment Configuration

### Required Environment Variables
```env
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=3306
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=recipe_link_saver
NODE_ENV=production
```

### Development Setup
1. Copy `.env.example` to `.env`
2. Fill in your database credentials
3. Run `npm install` to install dependencies
4. Run `npm run init-db` to initialize the database

## Files Structure

```
├── config/
│   └── database.js          # Database connection configuration
├── database/
│   └── schema.sql          # Database schema definition
├── scripts/
│   └── init-database.js    # Database initialization script
├── utils/
│   └── db-test.js          # Database connection tests
├── aws/
│   └── rds-setup.md        # AWS RDS setup guide
├── .env.example            # Environment variables template
└── package.json            # Node.js dependencies
```

## Usage

### Initialize Database
```bash
npm run init-db
```

### Test Database Connection
```bash
node utils/db-test.js
```

### Start Application
```bash
npm start          # Production
npm run dev        # Development with nodemon
```

## Database Operations

The `config/database.js` module provides:
- Connection pool management
- Query execution with error handling
- Connection testing utilities
- Graceful connection closing

### Example Usage
```javascript
const { executeQuery, testConnection } = require('./config/database');

// Test connection
await testConnection();

// Execute query
const recipes = await executeQuery('SELECT * FROM recipes ORDER BY date_added DESC');

// Execute query with parameters
const recipe = await executeQuery('SELECT * FROM recipes WHERE id = ?', [recipeId]);
```

## Security Features

1. **Connection Security**
   - SSL/TLS encryption for connections
   - Connection pooling with limits
   - Parameterized queries to prevent SQL injection

2. **Access Control**
   - Environment-based configuration
   - Separate credentials for different environments
   - Connection timeout and retry logic

3. **Data Protection**
   - Input validation and sanitization
   - Proper error handling without exposing sensitive data
   - Audit trail with created_at/updated_at timestamps

## Monitoring and Maintenance

### Health Checks
- Connection pool status monitoring
- Query performance tracking
- Error rate monitoring

### Backup Strategy
- Automated daily backups
- Point-in-time recovery capability
- Cross-region backup replication for production

### Performance Optimization
- Query optimization with proper indexing
- Connection pool tuning
- Regular performance monitoring

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check security group rules
   - Verify VPC configuration
   - Ensure RDS instance is running

2. **Authentication Failed**
   - Verify credentials in .env file
   - Check user permissions
   - Ensure password is correct

3. **Table Not Found**
   - Run database initialization: `npm run init-db`
   - Check if schema was applied correctly
   - Verify database name in connection string

### Debug Commands
```bash
# Test database connection
node -e "require('./config/database').testConnection()"

# Run full database tests
node utils/db-test.js

# Check table structure
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "DESCRIBE recipe_link_saver.recipes"
```

## Migration from Local Storage

When migrating from the local storage version:
1. Export existing data from browser localStorage
2. Transform data to match database schema
3. Import data using batch insert operations
4. Update frontend to use API endpoints instead of localStorage

## Next Steps

After database setup is complete:
1. Implement backend API endpoints (Task 12)
2. Create CRUD operations (Task 13)
3. Add metadata extraction (Task 14)
4. Update frontend to use API (Task 15)