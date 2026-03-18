/**
 * 数据库迁移：为 users 表添加 login_code、login_code_expires 字段
 * 用途：支持邮箱验证码登录
 */
import mysql from 'mysql2/promise';
const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world');

async function run() {
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN login_code VARCHAR(6) NULL');
    console.log('Added login_code');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN login_code_expires DATETIME NULL');
    console.log('Added login_code_expires');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  console.log('Done');
  process.exit(0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
