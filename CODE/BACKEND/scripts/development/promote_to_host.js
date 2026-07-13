require('dotenv').config();
const { db, pool } = require('../../src/db');
const { sql } = require('drizzle-orm');
const crypto = require('crypto');

(async () => {
  try {
    const email = (process.argv[2] || '').trim() || 'govindmadhav609@gmail.com';
    
    console.log(`🔍 Looking for user with email: ${email}...`);
    
    const candidates = await db.execute(sql.raw(`
      select
        u.id,
        u.email,
        u.username,
        u.role,
        u."hostStatus"
      from users u
      where lower(u.email) = lower('${email}')
      limit 1
    `));

    if (!candidates.rows.length) {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }

    const target = candidates.rows[0];
    console.log(`\n✓ Found user:`, {
      id: target.id,
      email: target.email,
      username: target.username,
      currentRole: target.role,
      currentHostStatus: target.hostStatus
    });

    // 1. Update users table to mark as HOST and VERIFIED
    console.log('\n📝 Updating user role and host status...');
    await db.execute(sql.raw(`
      update users
      set role = 'HOST',
          "hostStatus" = 'VERIFIED',
          "updatedAt" = now()
      where id = '${target.id}'
    `));
    console.log('✓ User role and host_status updated');

    // 2. Create or update host_profiles
    console.log('📝 Setting up host profile...');
    const hostCode = `HOST_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    await db.execute(sql.raw(`
      insert into host_profiles (id, user_id, host_code, status, verified_at, created_at)
      values ('${crypto.randomUUID()}', '${target.id}', '${hostCode}', 'ACTIVE', now(), now())
      on conflict (user_id) do update
      set status = 'ACTIVE', verified_at = now()
    `));
    console.log('✓ Host profile created/updated');

    // 3. Verify
    console.log('\n✅ Verification:');
    const verify = await db.execute(sql.raw(`
      select 
        u.id, 
        u.email, 
        u.username, 
        u.role, 
        u."hostStatus",
        hp.host_code,
        hp.status as host_profile_status
      from users u
      left join host_profiles hp on hp.user_id = u.id
      where u.id = '${target.id}'
      limit 1
    `));

    const updated = verify.rows[0];
    console.log({
      email: updated.email,
      username: updated.username,
      role: updated.role,
      hostStatus: updated.hostStatus,
      hostCode: updated.host_code,
      hostProfileStatus: updated.host_profile_status
    });
    
    console.log('\n🎉 Promotion complete!');
  } catch (e) {
    console.error('❌ Promotion failed:', e.message);
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
