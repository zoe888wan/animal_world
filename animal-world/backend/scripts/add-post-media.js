/**
 * 数据库迁移：为 posts 表添加 location、videos、show_time、show_location 字段
 * 用途：支持动态附带定位、视频、可选显示时间与定位
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world');

async function run() {
  try {
    await pool.execute('ALTER TABLE posts ADD COLUMN location VARCHAR(200) NULL');
    console.log('Added location');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await pool.execute('ALTER TABLE posts ADD COLUMN videos JSON NULL');
    console.log('Added videos');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await pool.execute('ALTER TABLE posts ADD COLUMN show_time TINYINT(1) DEFAULT 1');
    console.log('Added show_time');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await pool.execute('ALTER TABLE posts ADD COLUMN show_location TINYINT(1) DEFAULT 0');
    console.log('Added show_location');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  console.log('Done');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
