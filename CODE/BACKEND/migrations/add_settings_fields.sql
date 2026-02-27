
ALTER TABLE users ADD COLUMN recovery_email VARCHAR(191);
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE playerprofile ADD COLUMN profileVisibility VARCHAR(20) DEFAULT 'public';
