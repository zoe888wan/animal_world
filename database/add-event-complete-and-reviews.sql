-- 活动成功举办加分 + 互评（评分/评价）表
-- 执行：Get-Content database/add-event-complete-and-reviews.sql | mysql -u app -papp123 animal_world

USE animal_world;

-- events: 添加完成加分标记，避免重复加分
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'completed_credit_given') = 0,
  'ALTER TABLE events ADD COLUMN completed_credit_given TINYINT(1) DEFAULT 0',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'completed_at') = 0,
  'ALTER TABLE events ADD COLUMN completed_at DATETIME NULL',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- event_reviews: 活动互评（1-5分，评价<=30字）
CREATE TABLE IF NOT EXISTS event_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment VARCHAR(120),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_event_review (event_id, from_user_id, to_user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_reviews_event ON event_reviews(event_id);
CREATE INDEX idx_event_reviews_to ON event_reviews(to_user_id);
