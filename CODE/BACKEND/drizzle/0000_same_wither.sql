CREATE TABLE `uid_counters` (
	`region_code` varchar(2) NOT NULL,
	`year` int NOT NULL,
	`last_value` int NOT NULL DEFAULT 0,
	CONSTRAINT `uid_counters_region_code_year_pk` PRIMARY KEY(`region_code`,`year`)
);
--> statement-breakpoint
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
CREATE TABLE `refreshtoken` (
	`id` varchar(191) NOT NULL,
	`token` varchar(500) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `refreshtoken_id` PRIMARY KEY(`id`),
	CONSTRAINT `refreshtoken_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `wallet` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`balance` bigint NOT NULL,
	`locked` bigint NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `wallet_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`walletId` varchar(191) NOT NULL,
	`type` varchar(50) NOT NULL,
	`source` varchar(50) NOT NULL,
	`amount` bigint NOT NULL,
	`balanceAfter` bigint NOT NULL DEFAULT 0,
	`tournamentId` varchar(191),
	`message` varchar(255),
	`metadata` text,
	`status` varchar(50) NOT NULL DEFAULT 'COMPLETED',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `transaction_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kycrequest` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`proofUrl` varchar(500) NOT NULL,
	`selfieUrl` varchar(500) NOT NULL,
	`rankProofUrl` varchar(500),
	`status` varchar(50) NOT NULL DEFAULT 'PENDING',
	`adminNotes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kycrequest_id` PRIMARY KEY(`id`),
	CONSTRAINT `kycrequest_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `team` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`captainId` varchar(191) NOT NULL,
	`maxMembers` int NOT NULL DEFAULT 5,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teammember` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`teamId` varchar(191) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'MEMBER',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `teammember_id` PRIMARY KEY(`id`),
	CONSTRAINT `teamMember_userId_teamId_unique` UNIQUE(`userId`,`teamId`)
);
--> statement-breakpoint
CREATE TABLE `tournament` (
	`id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`game` varchar(100) NOT NULL,
	`description` text,
	`type` varchar(50) NOT NULL,
	`teamSize` int,
	`hostId` varchar(191) NOT NULL,
	`entryFee` bigint NOT NULL,
	`prizePool` bigint NOT NULL,
	`minTeamsRequired` int NOT NULL,
	`insufficientRegPolicy` varchar(50) NOT NULL DEFAULT 'CANCEL',
	`status` varchar(50) NOT NULL DEFAULT 'UPCOMING',
	`currentRound` int DEFAULT 0,
	`totalRounds` int DEFAULT 0,
	`winnerId` varchar(191),
	`startTime` datetime NOT NULL,
	`registrationEnd` datetime NOT NULL,
	`collected` bigint NOT NULL DEFAULT 0,
	`hostProfit` bigint NOT NULL DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournament_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'INFO',
	`isRead` boolean NOT NULL DEFAULT false,
	`meta` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditlog` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetId` varchar(191),
	`details` text,
	`ipAddress` varchar(45),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auditlog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`shortName` varchar(100),
	`logoUrl` text,
	`bannerUrl` text,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_name_unique` UNIQUE(`name`),
	CONSTRAINT `game_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `registration` (
	`id` varchar(191) NOT NULL,
	`tournamentId` varchar(191) NOT NULL,
	`teamId` varchar(191),
	`userId` varchar(191),
	`status` varchar(50) NOT NULL DEFAULT 'PENDING',
	`paymentStatus` varchar(50) NOT NULL DEFAULT 'PENDING',
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registration_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match` (
	`id` varchar(191) NOT NULL,
	`tournamentId` varchar(191) NOT NULL,
	`round` int NOT NULL,
	`matchNumber` int NOT NULL,
	`participantAId` varchar(191),
	`participantBId` varchar(191),
	`nextMatchId` varchar(191),
	`positionInNextMatch` int,
	`scoreA` int DEFAULT 0,
	`scoreB` int DEFAULT 0,
	`winnerId` varchar(191),
	`status` varchar(50) NOT NULL DEFAULT 'SCHEDULED',
	`isBye` boolean DEFAULT false,
	`locked` boolean DEFAULT false,
	`startTime` datetime,
	`endTime` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerprofile` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`ign` varchar(191),
	`realName` varchar(255),
	`dateOfBirth` datetime,
	`avatarUrl` varchar(500),
	`bio` text,
	`country` varchar(100),
	`state` varchar(100),
	`city` varchar(100),
	`preferredServer` varchar(50),
	`discordId` varchar(100),
	`discordVisibility` varchar(20) DEFAULT 'private',
	`skillLevel` varchar(50),
	`playStyle` varchar(50),
	`availableDays` varchar(50),
	`availableTime` varchar(50),
	`completionPercentage` int DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playerprofile_id` PRIMARY KEY(`id`),
	CONSTRAINT `playerprofile_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `playerProfile_userId_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `playergameprofile` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`game` varchar(50) NOT NULL,
	`inGameName` varchar(191) NOT NULL,
	`inGameId` varchar(191) NOT NULL,
	`verificationStatus` varchar(50) DEFAULT 'PENDING',
	`verifiedBy` varchar(191),
	`meta` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playergameprofile_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adminassignment` (
	`id` varchar(191) NOT NULL,
	`adminId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`assignedBy` varchar(191) NOT NULL,
	`assignedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`revokedAt` datetime,
	CONSTRAINT `adminassignment_id` PRIMARY KEY(`id`)
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
ALTER TABLE `refreshtoken` ADD CONSTRAINT `refreshtoken_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet` ADD CONSTRAINT `wallet_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_walletId_wallet_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallet`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kycrequest` ADD CONSTRAINT `kycrequest_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team` ADD CONSTRAINT `team_captainId_users_id_fk` FOREIGN KEY (`captainId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teammember` ADD CONSTRAINT `teammember_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teammember` ADD CONSTRAINT `teammember_teamId_team_id_fk` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tournament` ADD CONSTRAINT `tournament_hostId_users_id_fk` FOREIGN KEY (`hostId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditlog` ADD CONSTRAINT `auditlog_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminassignment` ADD CONSTRAINT `adminassignment_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminassignment` ADD CONSTRAINT `adminassignment_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminassignment` ADD CONSTRAINT `adminassignment_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute` ADD CONSTRAINT `dispute_matchId_match_id_fk` FOREIGN KEY (`matchId`) REFERENCES `match`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dispute` ADD CONSTRAINT `dispute_raisedById_users_id_fk` FOREIGN KEY (`raisedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `host_applications` ADD CONSTRAINT `host_applications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `host_applications` ADD CONSTRAINT `host_applications_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_regionCode_idx` ON `users` (`regionCode`);--> statement-breakpoint
CREATE INDEX `user_country_code_idx` ON `users` (`country_code`);--> statement-breakpoint
CREATE INDEX `refreshToken_userId_idx` ON `refreshtoken` (`userId`);--> statement-breakpoint
CREATE INDEX `transaction_userId_idx` ON `transaction` (`userId`);--> statement-breakpoint
CREATE INDEX `transaction_walletId_idx` ON `transaction` (`walletId`);--> statement-breakpoint
CREATE INDEX `transaction_tournamentId_idx` ON `transaction` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `transaction_source_idx` ON `transaction` (`source`);--> statement-breakpoint
CREATE INDEX `team_captainId_idx` ON `team` (`captainId`);--> statement-breakpoint
CREATE INDEX `teamMember_teamId_idx` ON `teammember` (`teamId`);--> statement-breakpoint
CREATE INDEX `tournament_hostId_idx` ON `tournament` (`hostId`);--> statement-breakpoint
CREATE INDEX `tournament_status_idx` ON `tournament` (`status`);--> statement-breakpoint
CREATE INDEX `tournament_game_idx` ON `tournament` (`game`);--> statement-breakpoint
CREATE INDEX `notification_userId_idx` ON `notification` (`userId`);--> statement-breakpoint
CREATE INDEX `notification_isRead_idx` ON `notification` (`isRead`);--> statement-breakpoint
CREATE INDEX `auditLog_targetId_idx` ON `auditlog` (`targetId`);--> statement-breakpoint
CREATE INDEX `auditLog_userId_idx` ON `auditlog` (`userId`);--> statement-breakpoint
CREATE INDEX `auditLog_createdAt_idx` ON `auditlog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `game_slug_idx` ON `game` (`slug`);--> statement-breakpoint
CREATE INDEX `registration_tournamentId_idx` ON `registration` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `registration_teamId_idx` ON `registration` (`teamId`);--> statement-breakpoint
CREATE INDEX `registration_userId_idx` ON `registration` (`userId`);--> statement-breakpoint
CREATE INDEX `match_tournamentId_idx` ON `match` (`tournamentId`);--> statement-breakpoint
CREATE INDEX `match_winnerId_idx` ON `match` (`winnerId`);--> statement-breakpoint
CREATE INDEX `playerProfile_ign_idx` ON `playerprofile` (`ign`);--> statement-breakpoint
CREATE INDEX `playerGameProfile_userId_idx` ON `playergameprofile` (`userId`);--> statement-breakpoint
CREATE INDEX `playerGameProfile_game_inGameId_idx` ON `playergameprofile` (`game`,`inGameId`);--> statement-breakpoint
CREATE INDEX `adminAssignment_adminId_idx` ON `adminassignment` (`adminId`);--> statement-breakpoint
CREATE INDEX `adminAssignment_userId_idx` ON `adminassignment` (`userId`);--> statement-breakpoint
CREATE INDEX `adminAssignment_active_idx` ON `adminassignment` (`userId`,`revokedAt`);--> statement-breakpoint
CREATE INDEX `dispute_matchId_idx` ON `dispute` (`matchId`);--> statement-breakpoint
CREATE INDEX `dispute_raisedById_idx` ON `dispute` (`raisedById`);--> statement-breakpoint
CREATE INDEX `dispute_status_idx` ON `dispute` (`status`);