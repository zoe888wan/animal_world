-- 功能增强：活动类型/地区、宠物扩展、签到、信誉分购买、初始3分
-- 执行：mysql -u app -papp123 animal_world < add-features-v2.sql

USE animal_world;

-- 确保 event_end 存在（部分环境只有 event_end_date）
SET @sql0 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'event_end') = 0,
  'ALTER TABLE events ADD COLUMN event_end DATETIME NULL AFTER event_date',
  'SELECT 1'
);
PREPARE s0 FROM @sql0; EXECUTE s0; DEALLOCATE PREPARE s0;

-- events: 活动类型、省市区（文字化定位，用于同城/同区筛选）
SET @sql1 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'event_type') = 0,
  'ALTER TABLE events ADD COLUMN event_type VARCHAR(30) DEFAULT ''other'' COMMENT ''遛狗/餐厅/拍照/户外/室内/其他''',
  'SELECT 1'
);
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @sql2 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'province') = 0,
  'ALTER TABLE events ADD COLUMN province VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @sql3 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'city') = 0,
  'ALTER TABLE events ADD COLUMN city VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @sql4 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'district') = 0,
  'ALTER TABLE events ADD COLUMN district VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE s4 FROM @sql4; EXECUTE s4; DEALLOCATE PREPARE s4;

-- pets: 性格、体型、疫苗
SET @sql5 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets' AND COLUMN_NAME = 'temperament') = 0,
  'ALTER TABLE pets ADD COLUMN temperament VARCHAR(50) NULL COMMENT ''温和/活泼/胆小/好斗等''',
  'SELECT 1'
);
PREPARE s5 FROM @sql5; EXECUTE s5; DEALLOCATE PREPARE s5;

SET @sql6 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets' AND COLUMN_NAME = 'size_type') = 0,
  'ALTER TABLE pets ADD COLUMN size_type VARCHAR(20) NULL COMMENT ''小型/中型/大型''',
  'SELECT 1'
);
PREPARE s6 FROM @sql6; EXECUTE s6; DEALLOCATE PREPARE s6;

SET @sql7 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pets' AND COLUMN_NAME = 'vaccinated') = 0,
  'ALTER TABLE pets ADD COLUMN vaccinated TINYINT(1) DEFAULT 0 COMMENT ''1=已疫苗''',
  'SELECT 1'
);
PREPARE s7 FROM @sql7; EXECUTE s7; DEALLOCATE PREPARE s7;

-- event_checkins: 活动签到
CREATE TABLE IF NOT EXISTS event_checkins (
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- credit_purchases: 信誉分购买记录（用于累加定价：第1次10元，第2次15元...）
CREATE TABLE IF NOT EXISTS credit_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credit_restored INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_credit_purchases_user ON credit_purchases(user_id);

-- 信誉分：初始改为 3 分
ALTER TABLE users MODIFY COLUMN credit_score INT DEFAULT 3;
UPDATE users SET credit_score = 3 WHERE credit_score IS NULL OR credit_score = 2;

-- 添加信誉分恢复商品（type=credit_restore，价格由后端按购买次数动态计算）
INSERT INTO products (name, description, price, type, popularity_boost)
SELECT '信誉分恢复', '信誉分为0时可用，恢复1分。首次10元，之后每次+5元累加。', 10, 'credit_restore', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM products WHERE type = 'credit_restore' LIMIT 1);
