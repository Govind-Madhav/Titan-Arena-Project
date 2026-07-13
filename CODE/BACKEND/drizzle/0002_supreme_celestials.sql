ALTER TABLE "users" ADD COLUMN "mfa_secret" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hostUid" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "adminUid" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "superAdminUid" varchar(20);--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "rules" text;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "bannerUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "streamUrl" text;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "streamPlatform" varchar(20) DEFAULT 'OTHER';--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "streamId" varchar(191);--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "streamScope" varchar(20) DEFAULT 'MATCH';--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "streamIsLive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "maxParticipants" integer;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "nextMatchSlot" varchar(5);--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "bracket_section" varchar(20) DEFAULT 'WINNERS';--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "loser_next_match_id" varchar(191);--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "loser_next_match_slot" varchar(5);--> statement-breakpoint
CREATE UNIQUE INDEX "user_hostUid_idx" ON "users" USING btree ("hostUid");--> statement-breakpoint
CREATE UNIQUE INDEX "user_adminUid_idx" ON "users" USING btree ("adminUid");--> statement-breakpoint
CREATE UNIQUE INDEX "user_superAdminUid_idx" ON "users" USING btree ("superAdminUid");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_hostUid_unique" UNIQUE("hostUid");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_adminUid_unique" UNIQUE("adminUid");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_superAdminUid_unique" UNIQUE("superAdminUid");