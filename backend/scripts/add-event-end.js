/**
 * 数据库迁移：为 events 表添加 event_end 字段（活动结束时间）
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world');

async function run() {
  try {
    await pool.execute('ALTER TABLE events ADD COLUMN event_end DATETIME NULL');
    console.log('Added event_end');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.error('event_end:', e.message);
  }
  console.log('Done');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
