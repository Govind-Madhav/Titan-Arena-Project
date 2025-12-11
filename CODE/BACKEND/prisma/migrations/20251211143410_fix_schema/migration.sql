/*
  Warnings:

  - A unique constraint covering the columns `[verificationToken]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payout` MODIFY `amount` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `tournament` MODIFY `entryFee` BIGINT NOT NULL,
    MODIFY `prizePool` BIGINT NOT NULL,
    MODIFY `collected` BIGINT NOT NULL DEFAULT 0,
    MODIFY `hostProfit` BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `transaction` MODIFY `amount` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `verificationExpiry` DATETIME(3) NULL,
    ADD COLUMN `verificationToken` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `wallet` MODIFY `balance` BIGINT NOT NULL DEFAULT 0,
    MODIFY `locked` BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `withdrawalrequest` MODIFY `amount` BIGINT NOT NULL;

-- CreateTable
CREATE TABLE `game` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `logoUrl` TEXT NULL,
    `bannerUrl` TEXT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Game_name_key`(`name`),
    UNIQUE INDEX `Game_slug_key`(`slug`),
    INDEX `Game_isActive_idx`(`isActive`),
    INDEX `Game_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_verificationToken_key` ON `user`(`verificationToken`);
