-- Add user_memories table for AI chatbot long-term memory
CREATE TABLE user_memories (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_type TEXT NOT NULL, -- 'preference', 'history', 'technical_context'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast retrieval by user
CREATE INDEX idx_user_memories_user_id ON user_memories(user_id);
