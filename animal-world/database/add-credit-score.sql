-- 信誉分系统
-- 用户初始信誉分 2，未赴约扣 1 分，0 分以下无法参加/组织活动
-- 执行：mysql -u app -papp123 animal_world < add-credit-score.sql

USE animal_world;

-- users 添加 credit_score，默认 2
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'credit_score') = 0,
  'ALTER TABLE users ADD COLUMN credit_score INT DEFAULT 2',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users SET credit_score = 2 WHERE credit_score IS NULL;

-- event_participants 添加 noshow 标记（发起者可在活动结束后标记未赴约）
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND COLUMN_NAME = 'noshow') = 0,
  'ALTER TABLE event_participants ADD COLUMN noshow TINYINT(1) DEFAULT 0',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
