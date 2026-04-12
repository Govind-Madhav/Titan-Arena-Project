require('dotenv').config();
const { db, pool } = require('../../src/db');
const { sql } = require('drizzle-orm');

(async () => {
  try {
    const candidates = await db.execute(sql.raw(`
      select
        u.id,
        u.email,
        u.username,
        u.role,
        u.is_admin,
        p.ign
      from users u
      left join playerprofile p on p."userId" = u.id
      where lower(u.username) = lower('titan')
         or lower(u.email) = lower('titan')
         or lower(p.ign) = lower('titan')
      order by u."createdAt" desc
    `));

    if (!candidates.rows.length) {
      console.log('No Titan account found (username/email/ign = titan).');
      return;
    }

    const target = candidates.rows[0];

    await db.execute(sql.raw(`
      update users
      set role = 'SUPERADMIN',
          is_admin = true,
          "updatedAt" = now()
      where id = '${target.id}'
    `));

    const verify = await db.execute(sql.raw(`
      select id, email, username, role, is_admin
      from users
      where id = '${target.id}'
      limit 1
    `));

    console.log('Promoted account:');
    console.log(JSON.stringify(verify.rows[0], null, 2));
  } catch (e) {
    console.error('Promotion failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
