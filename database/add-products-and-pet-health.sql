-- 增加食物、饰品种类，药物；宠物健康字段
USE animal_world;

-- 宠物健康状态
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets' AND COLUMN_NAME = 'health_status') = 0,
  "ALTER TABLE pets ADD COLUMN health_status VARCHAR(20) DEFAULT 'healthy'",
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 用户当前佩戴的头像框 product_id
SET @s2 = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_frame_id') = 0,
  'ALTER TABLE users ADD COLUMN avatar_frame_id INT NULL',
  'SELECT 1'
));
PREPARE stmt2 FROM @s2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 新增食物（各不同图与名）
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '鲜肉罐头', '新鲜肉罐头，宠物爱吃', 28, '/products/pet-can.png', 'pet_food', 12 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '鲜肉罐头');
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '磨牙棒', '清洁牙齿，磨牙必备', 18, '/products/pet-chew.png', 'pet_food', 8 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '磨牙棒');

-- 新增饰品（各不同图与名）
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '蝴蝶结', '可爱蝴蝶结，萌宠装扮', 12, '/products/pet-bow.png', 'pet_accessory', 5 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '蝴蝶结');
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '小铃铛', '叮当悦耳，出行标识', 8, '/products/pet-bell.png', 'pet_accessory', 3 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '小铃铛');

-- 药物
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '感冒药', '治疗宠物感冒', 25, '/products/medicine-cold.png', 'medicine', 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '感冒药');
INSERT INTO products (name, description, price, image_url, type, popularity_boost)
SELECT '肠胃药', '调理肠胃不适', 30, '/products/medicine-stomach.png', 'medicine', 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '肠胃药');
