-- 移除头像框功能：删除头像框商品、用户佩戴关系及 users.avatar_frame_id 列
-- 执行：mysql -u app -papp123 animal_world < remove-avatar-frames.sql
-- 若含中文注释且 PowerShell 乱码，可：cmd /c "chcp 65001 && mysql -u app -papp123 animal_world < animal-world\database\remove-avatar-frames.sql"
SET NAMES utf8mb4;

USE animal_world;

-- 1) 清除用户已拥有的头像框记录（user_products）
DELETE up FROM user_products up
INNER JOIN products p ON up.product_id = p.id
WHERE p.type IN ('avatar_frame', 'avatar_frame_premium');

-- 2) 删除头像框商品
DELETE FROM products WHERE type IN ('avatar_frame', 'avatar_frame_premium');

-- 3) 取消所有用户的头像框佩戴
UPDATE users SET avatar_frame_id = NULL WHERE avatar_frame_id IS NOT NULL;

-- 4) 若存在则删除 users.avatar_frame_id 列（可选，保持表结构简洁）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_frame_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE users DROP COLUMN avatar_frame_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
