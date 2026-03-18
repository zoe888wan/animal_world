/**
 * 数据库迁移：为 posts 表添加 views_count 字段
 * 用途：记录动态浏览量
 */
import mysql from 'mysql2/promise';
const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world');

async function run() {
  try {
    await pool.execute('ALTER TABLE posts ADD COLUMN views_count INT DEFAULT 0');
    console.log('Added views_count');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  console.log('Done');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
