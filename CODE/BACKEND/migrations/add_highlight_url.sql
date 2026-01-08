-- Add highlightUrl column to tournaments table
-- Run this manually: npx drizzle-kit push or execute directly in your database

ALTER TABLE `tournament` ADD COLUMN `highlightUrl` VARCHAR(500) NULL AFTER `description`;
