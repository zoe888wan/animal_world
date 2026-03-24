-- 活动取消与通知
-- 1. 为 events 添加取消相关字段
-- 2. 创建 notifications 表
USE animal_world;

-- events 添加 cancelled
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'cancelled') = 0,
  'ALTER TABLE events ADD COLUMN cancelled TINYINT(1) DEFAULT 0',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- events 添加 cancel_reason
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'cancel_reason') = 0,
  'ALTER TABLE events ADD COLUMN cancel_reason TEXT NULL',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- events 添加 cancelled_at
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'cancelled_at') = 0,
  'ALTER TABLE events ADD COLUMN cancelled_at DATETIME NULL',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT,
    event_id INT NULL,
    read_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
