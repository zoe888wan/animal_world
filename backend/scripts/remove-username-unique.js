/**
 * 数据库迁移：移除 username 唯一约束，允许用户名重复
 * 邮箱保持唯一：一个邮箱只能注册一个账号
 */
import mysql from 'mysql2/promise';
const url = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/animal_world';

async function run() {
  const pool = mysql.createPool(url);
  try {
    await pool.execute('ALTER TABLE users DROP INDEX username');
    console.log('Removed UNIQUE constraint from username');
  } catch (e) {
    if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('username unique index may have different name, trying email check...');
      const [rows] = await pool.query("SHOW INDEX FROM users WHERE Column_name = 'username' AND Non_unique = 0");
      if (rows.length > 0) {
        const idx = rows[0].Key_name;
        await pool.execute(`ALTER TABLE users DROP INDEX \`${idx}\``);
        console.log('Removed index:', idx);
      }
    } else {
      throw e;
    }
  }
  console.log('Done');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
