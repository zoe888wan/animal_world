-- 个人资料修改限制 + 改名卡商品
USE animal_world;

-- 1. 添加 user_profile_edits 表记录每月修改次数
CREATE TABLE IF NOT EXISTS user_profile_edits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_profile_edits_user_time ON user_profile_edits(user_id, edited_at);

-- 2. 添加改名卡商品 (2元)，若不存在则插入（新库用 seed-mysql 含中文名）
INSERT INTO products (name, description, price, type, popularity_boost)
SELECT 'RenameCard', '2 extra profile edits per month', 2.00, 'rename_card', 0
FROM DUAL
WHERE (SELECT COUNT(*) FROM products WHERE type = 'rename_card') = 0;
