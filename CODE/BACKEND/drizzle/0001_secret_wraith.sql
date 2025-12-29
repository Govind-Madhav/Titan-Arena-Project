CREATE TABLE `users` (
	`id` varchar(191) NOT NULL,
	`username` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`player_code` varchar(20),
	`is_admin` boolean DEFAULT false,
	`legalName` varchar(255) NOT NULL,
	`dateOfBirth` datetime NOT NULL,
	`phone` varchar(20),
	`phoneVerified` boolean NOT NULL DEFAULT false,
	`phoneVisibility` varchar(20) NOT NULL DEFAULT 'private',
	`country_code` varchar(3) NOT NULL,
	`state` varchar(100) NOT NULL,
	`city` varchar(100),
	`regionCode` varchar(2) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'PLAYER',
	`hostStatus` varchar(50) NOT NULL DEFAULT 'NOT_VERIFIED',
	`platformUid` varchar(20),
	`isBanned` boolean NOT NULL DEFAULT false,
	`emailVerified` boolean NOT NULL DEFAULT false,
	`registrationCompleted` boolean NOT NULL DEFAULT false,
	`termsAccepted` boolean NOT NULL DEFAULT false,
	`passwordUpdatedAt` datetime,
	`lastLoginAt` datetime,
	`failedLoginCount` int DEFAULT 0,
	`bio` text,
	`avatarUrl` varchar(500),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_player_code_unique` UNIQUE(`player_code`),
	CONSTRAINT `users_platformUid_unique` UNIQUE(`platformUid`),
	CONSTRAINT `user_platformUid_idx` UNIQUE(`platformUid`),
	CONSTRAINT `user_username_idx` UNIQUE(`username`),
	CONSTRAINT `user_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `adminAssignment` (
	`id` varchar(191) NOT NULL,
	`adminId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`assignedBy` varchar(191) NOT NULL,
	`assignedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`revokedAt` datetime,
	CONSTRAINT `adminAssignment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dispute` (
	`id` varchar(191) NOT NULL,
	`matchId` varchar(191) NOT NULL,
	`raisedById` varchar(191) NOT NULL,
	`reason` text NOT NULL,
	`evidenceUrl` varchar(500),
	`status` varchar(50) NOT NULL DEFAULT 'OPEN',
	`resolution` text,
	`resolvedAt` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dispute_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_counters` (
	`key` varchar(20) NOT NULL,
	`last_number` int NOT NULL DEFAULT 0,
	CONSTRAINT `user_counters_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `host_profiles` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`host_code` varchar(20) NOT NULL,
	`status` enum('PENDING','ACTIVE','SUSPENDED','REVOKED') NOT NULL DEFAULT 'PENDING',
	`verified_at` timestamp,
	`verified_by` varchar(191),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `host_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `host_profiles_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `host_profiles_host_code_unique` UNIQUE(`host_code`)
);
--> statement-breakpoint
CREATE TABLE `host_applications` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`documents_url` text,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`reviewed_at` timestamp,
	`reviewed_by` varchar(191),
	CONSTRAINT `host_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`content` text NOT NULL,
	`type` enum('GENERAL','ACHIEVEMENT','TOURNAMENT_UPDATE') NOT NULL,
	`media_url` text,
	`likes_count` int DEFAULT 0,
	`is_deleted` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `wallet` MODIFY COLUMN `balance` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet` MODIFY COLUMN `locked` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet` MODIFY COLUMN `createdAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet` MODIFY COLUMN `updatedAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` MODIFY COLUMN `amount` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` MODIFY COLUMN `balanceAfter` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament` MODIFY COLUMN `entryFee` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament` MODIFY COLUMN `prizePool` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament` MODIFY COLUMN `collected` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament` MODIFY COLUMN `hostProfit` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `adminAssignment` ADD CONSTRAINT `adminAssignment_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminAssignment` ADD CONSTRAINT `adminAssignment_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminAssignment` ADD CONSTRAINT `adminAssignment_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute` ADD CONSTRAINT `dispute_matchId_match_id_fk` FOREIGN KEY (`matchId`) REFERENCES `match`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute` ADD CONSTRAINT `dispute_raisedById_users_id_fk` FOREIGN KEY (`raisedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `host_applications` ADD CONSTRAINT `host_applications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `host_applications` ADD CONSTRAINT `host_applications_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_regionCode_idx` ON `users` (`regionCode`);--> statement-breakpoint
CREATE INDEX `user_country_code_idx` ON `users` (`country_code`);--> statement-breakpoint
CREATE INDEX `adminAssignment_adminId_idx` ON `adminAssignment` (`adminId`);--> statement-breakpoint
CREATE INDEX `adminAssignment_userId_idx` ON `adminAssignment` (`userId`);--> statement-breakpoint
CREATE INDEX `adminAssignment_active_idx` ON `adminAssignment` (`userId`,`revokedAt`);--> statement-breakpoint
CREATE INDEX `dispute_matchId_idx` ON `dispute` (`matchId`);--> statement-breakpoint
CREATE INDEX `dispute_raisedById_idx` ON `dispute` (`raisedById`);--> statement-breakpoint
CREATE INDEX `dispute_status_idx` ON `dispute` (`status`);--> statement-breakpoint
ALTER TABLE `refreshToken` ADD CONSTRAINT `refreshToken_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet` ADD CONSTRAINT `wallet_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_walletId_wallet_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallet`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kycRequest` ADD CONSTRAINT `kycRequest_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team` ADD CONSTRAINT `team_captainId_users_id_fk` FOREIGN KEY (`captainId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMember` ADD CONSTRAINT `teamMember_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamMember` ADD CONSTRAINT `teamMember_teamId_team_id_fk` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tournament` ADD CONSTRAINT `tournament_hostId_users_id_fk` FOREIGN KEY (`hostId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLog` ADD CONSTRAINT `auditLog_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auditLog_createdAt_idx` ON `auditLog` (`createdAt`);--> statement-breakpoint
ALTER TABLE `transaction` DROP COLUMN `meta`;