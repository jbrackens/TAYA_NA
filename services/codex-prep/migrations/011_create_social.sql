-- Phoenix Platform Database Migrations
-- Migration: 011_create_social.sql
-- Purpose: Create social profiles, follows, and direct messages tables
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-08

-- Up
CREATE TYPE social_message_type AS ENUM ('text', 'system');

CREATE TABLE social_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_follows (
    follower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_user_id, following_user_id),
    CONSTRAINT social_follows_not_self CHECK (follower_user_id <> following_user_id)
);

CREATE TABLE social_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(128) NOT NULL,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type social_message_type NOT NULL DEFAULT 'text',
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_social_follows_following_user_id ON social_follows(following_user_id);
CREATE INDEX idx_social_follows_followed_at ON social_follows(followed_at DESC);
CREATE INDEX idx_social_messages_conversation_id ON social_messages(conversation_id, sent_at ASC);
CREATE INDEX idx_social_messages_to_user_id ON social_messages(to_user_id, sent_at DESC);
CREATE INDEX idx_social_messages_from_user_id ON social_messages(from_user_id, sent_at DESC);

-- Down
DROP TABLE IF EXISTS social_messages CASCADE;
DROP TABLE IF EXISTS social_follows CASCADE;
DROP TABLE IF EXISTS social_profiles CASCADE;
DROP TYPE IF EXISTS social_message_type CASCADE;
