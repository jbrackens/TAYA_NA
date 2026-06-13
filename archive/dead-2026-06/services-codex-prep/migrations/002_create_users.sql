-- Phoenix Platform Database Migrations
-- Migration: 002_create_users.sql
-- Purpose: Create users table with authentication and KYC fields
-- Dependencies: 001_create_extensions.sql
-- Date: 2026-03-07

-- Up
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user', 'guest');
CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    kyc_status kyc_status NOT NULL DEFAULT 'pending',
    first_name VARCHAR(128),
    last_name VARCHAR(128),
    date_of_birth DATE,
    phone VARCHAR(20),
    country VARCHAR(2),
    state VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Down
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS kyc_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
