-- Recipe Link Saver Database Schema
-- AWS RDS MySQL Database Schema

CREATE DATABASE IF NOT EXISTS recipe_link_saver;
USE recipe_link_saver;

-- Users table to store authenticated users
CREATE TABLE users (
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

-- Recipes table to store recipe links and metadata
CREATE TABLE recipes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    title VARCHAR(255),
    domain VARCHAR(255),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    memo TEXT,
    rating ENUM('未定', '微妙', 'まあまあ', '満足', '絶対リピ！') DEFAULT '未定',
    image_url VARCHAR(2048),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for better query performance
    INDEX idx_user_id (user_id),
    INDEX idx_date_added (date_added),
    INDEX idx_domain (domain),
    INDEX idx_rating (rating),
    INDEX idx_url_hash (url(255)),
    INDEX idx_user_url (user_id, url(255))
);

-- Insert sample data for testing (optional)
INSERT INTO recipes (id, url, title, domain, memo, rating) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'https://example.com/pasta-recipe', '美味しいパスタレシピ', 'example.com', '家族に人気のレシピ。トマトソースを多めにするのがコツ', '満足'),
('550e8400-e29b-41d4-a716-446655440002', 'https://cookpad.com/recipe/123456', 'チキンカレー', 'cookpad.com', 'スパイスの配合が絶妙', '絶対リピ！'),
('550e8400-e29b-41d4-a716-446655440003', 'https://delishkitchen.tv/recipes/456789', 'チョコレートケーキ', 'delishkitchen.tv', '誕生日用に作った', '未定');