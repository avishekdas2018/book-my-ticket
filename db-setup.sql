-- =============================================
-- Book My Ticket — Database Setup Script
-- Run this against your Neon DB (or local PG)
-- =============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Seats table (original schema + user_id FK)
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    isbooked INT DEFAULT 0,
    user_id INT REFERENCES users(id)
);

-- 3. Seed 20 seats (only if table is empty)
INSERT INTO seats (isbooked)
SELECT 0 FROM generate_series(1, 20)
WHERE NOT EXISTS (SELECT 1 FROM seats LIMIT 1);
