require('dotenv').config();
const { db, pool } = require('../../src/db');
const { sql } = require('drizzle-orm');

(async () => {
  try {
    const result = await db.execute(sql.raw("select count(*)::int as c from users where lower(username)=lower('Titan')"));
    console.log('username titan in users:', result.rows[0].c);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
