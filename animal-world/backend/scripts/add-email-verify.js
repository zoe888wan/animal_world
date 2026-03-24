import mysql from 'mysql2/promise';
const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/animal_world');
async function run() {
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0');
    console.log('Added email_verified');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN email_verify_token VARCHAR(64) NULL');
    console.log('Added email_verify_token');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN email_verify_expires DATETIME NULL');
    console.log('Added email_verify_expires');
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
  console.log('Done');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
