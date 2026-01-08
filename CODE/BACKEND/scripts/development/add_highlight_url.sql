-- Add highlightUrl column to tournaments table
ALTER TABLE `tournament` ADD COLUMN `highlightUrl` VARCHAR(500) NULL AFTER `description`;
