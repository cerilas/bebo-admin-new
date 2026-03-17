require('dotenv').config({ path: '/Users/denizcanilgin/Documents/birebiro-new-admin/api/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        merchant_oid,
        payment_type,
        payment_status,
        payment_amount,
        total_amount,
        notes,
        paid_at,
        created_at,
        updated_at,
        failed_reason_code,
        failed_reason_msg
      FROM "order"
      WHERE id = 212
    `);

    console.log('Order 212:');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await pool.end();
  }
})();
