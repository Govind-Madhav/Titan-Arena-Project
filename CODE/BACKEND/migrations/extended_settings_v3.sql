-- Add Extended Settings Fields to Users Table
ALTER TABLE users ADD COLUMN invoice_email VARCHAR(191);
ALTER TABLE users ADD COLUMN billing_address JSON;
ALTER TABLE users ADD COLUMN deactivated_at DATETIME;
ALTER TABLE users ADD COLUMN username_change_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN media_visibility VARCHAR(20) DEFAULT 'public';

-- Add Session Tracking to RefreshTokens Table
ALTER TABLE refreshtoken ADD COLUMN user_agent VARCHAR(255);
ALTER TABLE refreshtoken ADD COLUMN ip_address VARCHAR(45);

-- Create Blocked Users Table
CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_id VARCHAR(191) NOT NULL,
    blocked_id VARCHAR(191) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
);
