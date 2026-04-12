require('dotenv').config();
const { db, pool } = require('../../src/db');
const { sql } = require('drizzle-orm');

(async () => {
  try {
    const users = await db.execute(sql.raw("select count(*)::int as c from users"));
    const profiles = await db.execute(sql.raw("select count(*)::int as c from playerprofile"));
    const titan = await db.execute(sql.raw("select count(*)::int as c from playerprofile where lower(ign)=lower('Titan')"));

    console.log('users:', users.rows[0].c);
    console.log('playerprofile:', profiles.rows[0].c);
    console.log('ign titan:', titan.rows[0].c);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
