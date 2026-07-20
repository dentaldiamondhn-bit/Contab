-- Create chat_message table for support chat functionality
CREATE TABLE IF NOT EXISTS chat_message (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id VARCHAR(255) NOT NULL,
  receiver_id VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chatmessage_sender ON chat_message(sender_id);
CREATE INDEX IF NOT EXISTS idx_chatmessage_receiver ON chat_message(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chatmessage_created ON chat_message(created_at);

-- Add foreign key constraints
ALTER TABLE chat_message 
  ADD CONSTRAINT fk_chatmessage_sender 
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE chat_message 
  ADD CONSTRAINT fk_chatmessage_receiver 
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;