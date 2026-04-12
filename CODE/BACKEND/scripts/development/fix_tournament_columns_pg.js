require('dotenv').config();
const { db, pool } = require('../../src/db');
const { sql } = require('drizzle-orm');

const statements = [
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "bannerUrl" varchar(500)',
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "rules" text',
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "maxParticipants" integer',
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "streamScope" varchar(20) DEFAULT \'MATCH\'',
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "streamIsLive" boolean NOT NULL DEFAULT false',
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "streamPlatform" varchar(20) DEFAULT \'OTHER\'',
  'ALTER TABLE tournament ADD COLUMN IF NOT EXISTS "streamId" varchar(191)'
];

(async () => {
  try {
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
      console.log(`OK: ${stmt}`);
    }

    const cols = await db.execute(sql.raw("select column_name from information_schema.columns where table_name='tournament' order by ordinal_position"));
    console.log('\nTournament columns now:');
    console.log(cols.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error('Failed to patch tournament columns:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
