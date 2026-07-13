ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hostUid" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminUid" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "superAdminUid" VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS "user_hostUid_idx" ON "users" ("hostUid");
CREATE UNIQUE INDEX IF NOT EXISTS "user_adminUid_idx" ON "users" ("adminUid");
CREATE UNIQUE INDEX IF NOT EXISTS "user_superAdminUid_idx" ON "users" ("superAdminUid");