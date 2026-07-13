require('dotenv').config();
const { pool } = require('../src/db');

async function main() {
  try {
    const res = await pool.query(`
      SELECT status, COUNT(*)::int AS count, SUM(collected)::bigint AS total_collected, SUM("prizePool")::bigint AS total_prizes, SUM("hostProfit")::bigint AS total_host_profit
      FROM tournament
      GROUP BY status;
    `);
    console.log('Tournament Summary:');
    res.rows.forEach(row => {
      console.log(`- Status: ${row.status}, Count: ${row.count}, Collected: ${row.total_collected}, Winnings: ${row.total_prizes}, Host Profit: ${row.total_host_profit}`);
    });
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
