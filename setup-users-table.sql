-- Add users table and update recipes table for authentication
-- Run this SQL script on your database to enable authentication

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(2048),
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better query performance
    INDEX idx_google_id (google_id),
    INDEX idx_email (email),
    INDEX idx_last_login (last_login)
);

-- Check if user_id column exists in recipes table
-- If not, add it (this is safe to run multiple times)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'recipes' 
  AND COLUMN_NAME = 'user_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE recipes ADD COLUMN user_id VARCHAR(36) AFTER id', 
    'SELECT "user_id column already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'recipes' 
  AND CONSTRAINT_NAME = 'recipes_user_fk';

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE recipes ADD CONSTRAINT recipes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE', 
    'SELECT "Foreign key constraint already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_url ON recipes(user_id, url(255));

-- Show the current table structure
DESCRIBE users;
DESCRIBE recipes;