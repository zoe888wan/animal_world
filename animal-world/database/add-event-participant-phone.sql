-- 约玩报名：添加电话号码字段
-- 执行：mysql -u app -papp123 animal_world < add-event-participant-phone.sql
-- 若列已存在会报错 "Duplicate column name"，可忽略

USE animal_world;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_participants' AND COLUMN_NAME = 'phone') = 0,
  'ALTER TABLE event_participants ADD COLUMN phone VARCHAR(20) NULL AFTER pet_id',
  'SELECT 1 AS _'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
