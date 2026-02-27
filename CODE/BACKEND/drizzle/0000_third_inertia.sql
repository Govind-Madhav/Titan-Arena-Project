CREATE TABLE "users" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"username" varchar(191) NOT NULL,
	"email" varchar(191) NOT NULL,
	"password_hash" varchar(255),
	"recovery_email" varchar(191),
	"mfa_enabled" boolean DEFAULT false,
	"firebase_uid" varchar(128),
	"auth_provider" "auth_provider" DEFAULT 'FIREBASE',
	"player_code" varchar(20),
	"is_admin" boolean DEFAULT false,
	"legalName" varchar(255) NOT NULL,
	"dateOfBirth" timestamp NOT NULL,
	"phone" varchar(20),
	"phoneVerified" boolean DEFAULT false NOT NULL,
	"phoneVisibility" varchar(20) DEFAULT 'private' NOT NULL,
	"media_visibility" varchar(20) DEFAULT 'public',
	"invoice_email" varchar(191),
	"billing_address" json,
	"deactivated_at" timestamp,
	"username_change_count" integer DEFAULT 0,
	"country_code" varchar(3) NOT NULL,
	"state" varchar(100) NOT NULL,
	"city" varchar(100),
	"region_code" integer NOT NULL,
	"sub_region_code" varchar(10),
	"role" varchar(50) DEFAULT 'PLAYER' NOT NULL,
	"hostStatus" varchar(50) DEFAULT 'NOT_VERIFIED' NOT NULL,
	"platformUid" varchar(20),
	"isBanned" boolean DEFAULT false NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"registrationCompleted" boolean DEFAULT false NOT NULL,
	"termsAccepted" boolean DEFAULT false NOT NULL,
	"passwordUpdatedAt" timestamp,
	"lastLoginAt" timestamp,
	"failedLoginCount" integer DEFAULT 0,
	"bio" text,
	"avatarUrl" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_player_code_unique" UNIQUE("player_code"),
	CONSTRAINT "users_platformUid_unique" UNIQUE("platformUid")
);
--> statement-breakpoint
CREATE TABLE "refreshtoken" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"token" varchar(500) NOT NULL,
	"userId" varchar(191) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"user_agent" varchar(255),
	"ip_address" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refreshtoken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"balance" bigint NOT NULL,
	"locked" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "wallet_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"walletId" varchar(191) NOT NULL,
	"type" varchar(50) NOT NULL,
	"source" varchar(50) NOT NULL,
	"amount" bigint NOT NULL,
	"balanceAfter" bigint DEFAULT 0 NOT NULL,
	"tournamentId" varchar(191),
	"message" varchar(255),
	"metadata" text,
	"status" varchar(50) DEFAULT 'COMPLETED' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kycrequest" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"documentType" varchar(100) NOT NULL,
	"proofUrl" varchar(500) NOT NULL,
	"selfieUrl" varchar(500) NOT NULL,
	"rankProofUrl" varchar(500),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"adminNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kycrequest_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(191) NOT NULL,
	"captainId" varchar(191) NOT NULL,
	"maxMembers" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teammember" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"teamId" varchar(191) NOT NULL,
	"role" varchar(50) DEFAULT 'MEMBER' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"game" varchar(100) NOT NULL,
	"description" text,
	"highlightUrl" varchar(500),
	"type" varchar(50) NOT NULL,
	"format" varchar(50) DEFAULT 'SINGLE_ELIMINATION' NOT NULL,
	"seeding" varchar(20) DEFAULT 'RANDOM' NOT NULL,
	"teamSize" integer,
	"hostId" varchar(191) NOT NULL,
	"entryFee" bigint NOT NULL,
	"prizePool" bigint NOT NULL,
	"minTeamsRequired" integer NOT NULL,
	"insufficientRegPolicy" varchar(50) DEFAULT 'CANCEL' NOT NULL,
	"status" varchar(50) DEFAULT 'UPCOMING' NOT NULL,
	"currentRound" integer DEFAULT 0,
	"totalRounds" integer DEFAULT 0,
	"winnerId" varchar(191),
	"startTime" timestamp NOT NULL,
	"registrationEnd" timestamp NOT NULL,
	"checkinStart" timestamp,
	"checkinEnd" timestamp,
	"collected" bigint DEFAULT 0 NOT NULL,
	"hostProfit" bigint DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) DEFAULT 'INFO' NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"meta" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditlog" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"action" varchar(100) NOT NULL,
	"targetId" varchar(191),
	"details" text,
	"ipAddress" varchar(45),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(191) NOT NULL,
	"slug" varchar(191) NOT NULL,
	"shortName" varchar(100),
	"logoUrl" text,
	"bannerUrl" text,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_name_unique" UNIQUE("name"),
	CONSTRAINT "game_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "registration" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"tournamentId" varchar(191) NOT NULL,
	"teamId" varchar(191),
	"userId" varchar(191),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"paymentStatus" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"tournamentId" varchar(191) NOT NULL,
	"round" integer NOT NULL,
	"matchNumber" integer NOT NULL,
	"participantAId" varchar(191),
	"participantBId" varchar(191),
	"nextMatchId" varchar(191),
	"positionInNextMatch" integer,
	"scoreA" integer DEFAULT 0,
	"scoreB" integer DEFAULT 0,
	"winnerId" varchar(191),
	"status" varchar(50) DEFAULT 'SCHEDULED' NOT NULL,
	"isBye" boolean DEFAULT false,
	"locked" boolean DEFAULT false,
	"startTime" timestamp,
	"endTime" timestamp,
	"proofUrl" text,
	"streamUrl" text,
	"vodUrl" text,
	"spectatorCode" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playerprofile" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"ign" varchar(191),
	"realName" varchar(255),
	"dateOfBirth" timestamp,
	"avatarUrl" varchar(500),
	"bio" text,
	"country" varchar(100),
	"state" varchar(100),
	"city" varchar(100),
	"preferredServer" varchar(50),
	"discordId" varchar(100),
	"discordVisibility" varchar(20) DEFAULT 'private',
	"skillLevel" varchar(50),
	"playStyle" varchar(50),
	"availableDays" varchar(50),
	"availableTime" varchar(50),
	"completionPercentage" integer DEFAULT 0,
	"profileVisibility" varchar(20) DEFAULT 'public',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playerprofile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "playergameprofile" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"game" varchar(50) NOT NULL,
	"inGameName" varchar(191) NOT NULL,
	"inGameId" varchar(191) NOT NULL,
	"verificationStatus" varchar(50) DEFAULT 'PENDING',
	"verifiedBy" varchar(191),
	"meta" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adminassignment" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"adminId" varchar(191) NOT NULL,
	"userId" varchar(191) NOT NULL,
	"assignedBy" varchar(191) NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "dispute" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"matchId" varchar(191) NOT NULL,
	"raisedById" varchar(191) NOT NULL,
	"reason" text NOT NULL,
	"evidenceUrl" varchar(500),
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"resolution" text,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uid_counters" (
	"region" integer PRIMARY KEY NOT NULL,
	"last_value" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_counters" (
	"key" varchar(20) PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_profiles" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"host_code" varchar(20) NOT NULL,
	"status" "host_status_enum" DEFAULT 'PENDING' NOT NULL,
	"verified_at" timestamp,
	"verified_by" varchar(191),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "host_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "host_profiles_host_code_unique" UNIQUE("host_code")
);
--> statement-breakpoint
CREATE TABLE "host_applications" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"status" "host_application_status" DEFAULT 'PENDING' NOT NULL,
	"documents_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar(191)
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"content" text NOT NULL,
	"type" "post_type" NOT NULL,
	"media_url" text,
	"likes_count" integer DEFAULT 0,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocked_users" (
	"blocker_id" varchar(191) NOT NULL,
	"blocked_id" varchar(191) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blocked_users_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"tournamentId" varchar(191) NOT NULL,
	"userId" varchar(191),
	"teamId" varchar(191),
	"position" integer NOT NULL,
	"amount" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"tournamentId" varchar(191) NOT NULL,
	"userId" varchar(191),
	"teamId" varchar(191),
	"checkedInAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mmr_rating" (
	"userId" varchar(191) PRIMARY KEY NOT NULL,
	"rating" integer DEFAULT 1000 NOT NULL,
	"gamesPlayed" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"peakRating" integer DEFAULT 1000 NOT NULL,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"tier" varchar(30) DEFAULT 'BRONZE' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"iconUrl" text,
	"tier" varchar(20) DEFAULT 'BRONZE' NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievement" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"userId" varchar(191) NOT NULL,
	"achievementId" varchar(50) NOT NULL,
	"unlockedAt" timestamp DEFAULT now() NOT NULL,
	"meta" json
);
--> statement-breakpoint
CREATE TABLE "clan" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"tag" varchar(10) NOT NULL,
	"description" text,
	"logoUrl" text,
	"bannerUrl" text,
	"ownerId" varchar(191) NOT NULL,
	"totalWins" integer DEFAULT 0 NOT NULL,
	"membersCount" integer DEFAULT 1 NOT NULL,
	"isOpen" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clan_name_unique" UNIQUE("name"),
	CONSTRAINT "clan_tag_unique" UNIQUE("tag")
);
--> statement-breakpoint
CREATE TABLE "clan_member" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"clanId" varchar(191) NOT NULL,
	"userId" varchar(191) NOT NULL,
	"role" varchar(30) DEFAULT 'MEMBER' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_mmr_rating" (
	"teamId" varchar(191) PRIMARY KEY NOT NULL,
	"rating" integer DEFAULT 1000 NOT NULL,
	"gamesPlayed" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"peakRating" integer DEFAULT 1000 NOT NULL,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"tier" varchar(30) DEFAULT 'BRONZE' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_mvp" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"matchId" varchar(191) NOT NULL,
	"tournamentId" varchar(191) NOT NULL,
	"teamId" varchar(191) NOT NULL,
	"userId" varchar(191) NOT NULL,
	"mmrBonus" integer DEFAULT 0 NOT NULL,
	"reason" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refreshtoken" ADD CONSTRAINT "refreshtoken_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_walletId_wallet_id_fk" FOREIGN KEY ("walletId") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kycrequest" ADD CONSTRAINT "kycrequest_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_captainId_users_id_fk" FOREIGN KEY ("captainId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teammember" ADD CONSTRAINT "teammember_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teammember" ADD CONSTRAINT "teammember_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_hostId_users_id_fk" FOREIGN KEY ("hostId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditlog" ADD CONSTRAINT "auditlog_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adminassignment" ADD CONSTRAINT "adminassignment_adminId_users_id_fk" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adminassignment" ADD CONSTRAINT "adminassignment_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adminassignment" ADD CONSTRAINT "adminassignment_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_matchId_match_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_raisedById_users_id_fk" FOREIGN KEY ("raisedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_applications" ADD CONSTRAINT "host_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_tournamentId_tournament_id_fk" FOREIGN KEY ("tournamentId") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_tournamentId_tournament_id_fk" FOREIGN KEY ("tournamentId") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mmr_rating" ADD CONSTRAINT "mmr_rating_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_achievementId_achievement_id_fk" FOREIGN KEY ("achievementId") REFERENCES "public"."achievement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan" ADD CONSTRAINT "clan_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_member" ADD CONSTRAINT "clan_member_clanId_clan_id_fk" FOREIGN KEY ("clanId") REFERENCES "public"."clan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_member" ADD CONSTRAINT "clan_member_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_mmr_rating" ADD CONSTRAINT "team_mmr_rating_teamId_team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_mvp" ADD CONSTRAINT "match_mvp_matchId_match_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_mvp" ADD CONSTRAINT "match_mvp_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_platformUid_idx" ON "users" USING btree ("platformUid");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_regionCode_idx" ON "users" USING btree ("region_code");--> statement-breakpoint
CREATE INDEX "user_country_code_idx" ON "users" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_firebase_uid" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "refreshToken_userId_idx" ON "refreshtoken" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transaction_userId_idx" ON "transaction" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transaction_walletId_idx" ON "transaction" USING btree ("walletId");--> statement-breakpoint
CREATE INDEX "transaction_tournamentId_idx" ON "transaction" USING btree ("tournamentId");--> statement-breakpoint
CREATE INDEX "transaction_source_idx" ON "transaction" USING btree ("source");--> statement-breakpoint
CREATE INDEX "team_captainId_idx" ON "team" USING btree ("captainId");--> statement-breakpoint
CREATE INDEX "teamMember_teamId_idx" ON "teammember" USING btree ("teamId");--> statement-breakpoint
CREATE UNIQUE INDEX "teamMember_userId_teamId_unique" ON "teammember" USING btree ("userId","teamId");--> statement-breakpoint
CREATE INDEX "tournament_hostId_idx" ON "tournament" USING btree ("hostId");--> statement-breakpoint
CREATE INDEX "tournament_status_idx" ON "tournament" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tournament_game_idx" ON "tournament" USING btree ("game");--> statement-breakpoint
CREATE INDEX "notification_userId_idx" ON "notification" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "notification_isRead_idx" ON "notification" USING btree ("isRead");--> statement-breakpoint
CREATE INDEX "auditLog_targetId_idx" ON "auditlog" USING btree ("targetId");--> statement-breakpoint
CREATE INDEX "auditLog_userId_idx" ON "auditlog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auditLog_createdAt_idx" ON "auditlog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "game_slug_idx" ON "game" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "registration_tournamentId_idx" ON "registration" USING btree ("tournamentId");--> statement-breakpoint
CREATE INDEX "registration_teamId_idx" ON "registration" USING btree ("teamId");--> statement-breakpoint
CREATE INDEX "registration_userId_idx" ON "registration" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "match_tournamentId_idx" ON "match" USING btree ("tournamentId");--> statement-breakpoint
CREATE INDEX "match_winnerId_idx" ON "match" USING btree ("winnerId");--> statement-breakpoint
CREATE UNIQUE INDEX "playerProfile_userId_idx" ON "playerprofile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "playerProfile_ign_idx" ON "playerprofile" USING btree ("ign");--> statement-breakpoint
CREATE INDEX "playerGameProfile_userId_idx" ON "playergameprofile" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "playerGameProfile_game_inGameId_idx" ON "playergameprofile" USING btree ("game","inGameId");--> statement-breakpoint
CREATE INDEX "adminAssignment_adminId_idx" ON "adminassignment" USING btree ("adminId");--> statement-breakpoint
CREATE INDEX "adminAssignment_userId_idx" ON "adminassignment" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "adminAssignment_active_idx" ON "adminassignment" USING btree ("userId","revokedAt");--> statement-breakpoint
CREATE INDEX "dispute_matchId_idx" ON "dispute" USING btree ("matchId");--> statement-breakpoint
CREATE INDEX "dispute_raisedById_idx" ON "dispute" USING btree ("raisedById");--> statement-breakpoint
CREATE INDEX "dispute_status_idx" ON "dispute" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payout_tournamentId_idx" ON "payout" USING btree ("tournamentId");--> statement-breakpoint
CREATE INDEX "payout_userId_idx" ON "payout" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "checkin_tournamentId_idx" ON "checkin" USING btree ("tournamentId");--> statement-breakpoint
CREATE UNIQUE INDEX "checkin_tournament_participant_unique" ON "checkin" USING btree ("tournamentId","userId");--> statement-breakpoint
CREATE INDEX "mmr_rating_idx" ON "mmr_rating" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "mmr_tier_idx" ON "mmr_rating" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "userAchievement_userId_idx" ON "user_achievement" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "userAchievement_user_achievement_unique" ON "user_achievement" USING btree ("userId","achievementId");--> statement-breakpoint
CREATE UNIQUE INDEX "clan_tag_idx" ON "clan" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "clan_owner_idx" ON "clan" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "clanMember_clanId_idx" ON "clan_member" USING btree ("clanId");--> statement-breakpoint
CREATE UNIQUE INDEX "clanMember_user_unique" ON "clan_member" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "team_mmr_rating_idx" ON "team_mmr_rating" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "team_mmr_tier_idx" ON "team_mmr_rating" USING btree ("tier");--> statement-breakpoint
CREATE UNIQUE INDEX "match_mvp_matchId_unique" ON "match_mvp" USING btree ("matchId");--> statement-breakpoint
CREATE INDEX "match_mvp_userId_idx" ON "match_mvp" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "match_mvp_tournamentId_idx" ON "match_mvp" USING btree ("tournamentId");