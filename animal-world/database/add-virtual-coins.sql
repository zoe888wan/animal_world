-- 虚拟币系统：每日登录奖励、宠物互动奖励、商城虚拟币购买
-- 执行：mysql -u app -papp123 animal_world < add-virtual-coins.sql

USE animal_world;

-- 用户虚拟币（幂等：仅当列不存在时添加）
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'coins') = 0,
  'ALTER TABLE users ADD COLUMN coins INT DEFAULT 0',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login_date') = 0,
  'ALTER TABLE users ADD COLUMN last_login_date DATE NULL',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'pet_interact_date') = 0,
  'ALTER TABLE users ADD COLUMN pet_interact_date DATE NULL',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'pet_interact_count') = 0,
  'ALTER TABLE users ADD COLUMN pet_interact_count INT DEFAULT 0',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
