require('dotenv').config();
const { db, pool } = require('../../src/db');
const { sql } = require('drizzle-orm');

(async () => {
  try {
    await db.execute(sql.raw('TRUNCATE TABLE playergameprofile, playerprofile RESTART IDENTITY CASCADE'));
    const titan = await db.execute(sql.raw("select count(*)::int as c from playerprofile where lower(ign)=lower('Titan')"));
    const profiles = await db.execute(sql.raw("select count(*)::int as c from playerprofile"));
    console.log('playerprofile after cleanup:', profiles.rows[0].c);
    console.log('ign titan after cleanup:', titan.rows[0].c);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
