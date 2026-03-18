/**
 * 数据库迁移：为 products 表添加 avatar_value 字段，并插入头像类商品
 * 用途：支持付费特殊头像商品
 */
import mysql from 'mysql2/promise';
const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world');

async function run() {
  try {
    await pool.execute('ALTER TABLE products ADD COLUMN avatar_value VARCHAR(100) NULL');
    console.log('Added avatar_value');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  // 插入特殊头像商品（emoji 类）
  await pool.execute(`
    INSERT IGNORE INTO products (name, description, price, type, avatar_value, popularity_boost) VALUES
    ('龙系头像', '霸气龙形头像', 6.99, 'avatar', '🐲', 0),
    ('独角兽头像', '梦幻独角兽头像', 8.99, 'avatar', '🦄', 0),
    ('皇冠头像', '尊贵皇冠头像', 4.99, 'avatar', '👑', 0),
    ('蝴蝶头像', '灵动蝴蝶头像', 3.99, 'avatar', '🦋', 0)
  `);
  console.log('Added avatar products');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
