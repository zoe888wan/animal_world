/**
 * 数据库迁移：评论可删除、评论点赞、动态宠物文本
 * - comment_likes 表
 * - posts.pet_display 字段
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world');

async function run() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        comment_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_comment_likes (user_id, comment_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);
    console.log('Created comment_likes table');
  } catch (e) {
    console.error('comment_likes:', e.message);
  }
  try {
    await pool.execute('ALTER TABLE posts ADD COLUMN pet_display VARCHAR(100) NULL');
    console.log('Added pet_display');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') console.error('pet_display:', e.message);
  }
  console.log('Done');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
