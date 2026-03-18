-- 1) 确保 users 表有 avatar_frame_id 列（佩戴头像框才能保存）
-- 2) 商品改为花草/颜色命名并写入数据库（紫薇花、雏菊、缠绕花藤、烂漫樱）
-- 执行：mysql -u app -papp123 animal_world < apply-product-names-and-avatar-frame.sql

SET NAMES utf8mb4;
USE animal_world;

-- 确保 users 有 avatar_frame_id 列
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_frame_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN avatar_frame_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 曝光度上限 50
UPDATE products SET popularity_boost = LEAST(COALESCE(popularity_boost, 0), 50) WHERE popularity_boost > 50;
UPDATE products SET description = '选择一只宠物使用，为其增加最多 50 曝光度' WHERE type = 'boost';

-- 头像框：花草命名
UPDATE products SET name = '雏菊', description = '小雏菊边框，清新可爱', image_url = COALESCE(NULLIF(image_url, ''), '/products/avatar-frame.png') WHERE type = 'avatar_frame';
UPDATE products SET name = '紫薇花', description = '紫薇花色，温柔浪漫', image_url = COALESCE(NULLIF(image_url, ''), '/products/frame-gold.png') WHERE type = 'avatar_frame_premium' AND (name LIKE '%金%' OR name LIKE '%璀璨%' OR name LIKE '%明星%');
UPDATE products SET name = '缠绕花藤', description = '缠绕花藤，自然清新', image_url = COALESCE(NULLIF(image_url, ''), '/products/frame-crystal.png') WHERE type = 'avatar_frame_premium' AND (name LIKE '%紫%' OR name LIKE '%水晶%' OR name LIKE '%奶油%');
UPDATE products SET name = '烂漫樱', description = '樱花烂漫，春日气息', image_url = COALESCE(NULLIF(image_url, ''), '/products/frame-diamond.png') WHERE type = 'avatar_frame_premium' AND (name LIKE '%钻石%' OR name LIKE '%VIP%' OR name LIKE '%薄荷%' OR name LIKE '%绿%');

-- 饰品
UPDATE products SET name = '雏菊项圈', description = '小雏菊点缀，清新可爱' WHERE type = 'pet_accessory' AND (name LIKE '%项圈%' OR name LIKE '%可爱%' OR name LIKE '%花朵%');
UPDATE products SET name = '蝴蝶结发夹', description = '软萌蝴蝶结，萌宠必备' WHERE type = 'pet_accessory' AND name LIKE '%蝴蝶%';
UPDATE products SET name = '小铃铛', description = '轻轻叮当，出行安心' WHERE type = 'pet_accessory' AND name LIKE '%铃铛%';

-- 食物描述
UPDATE products SET description = '小零食大满足，简约健康' WHERE type = 'pet_food' AND (name LIKE '%零食%' OR name LIKE '%美味%');
UPDATE products SET description = '优质蛋白，宠物最爱' WHERE type = 'pet_food' AND (name LIKE '%冻干%' OR name LIKE '%鸡肉%');
