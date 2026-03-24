-- 约玩活动：添加结束时间、地点定位链接
-- 执行：mysql -u app -papp123 animal_world < add-events-end-date-location.sql
-- 若列已存在会报错 "Duplicate column name"，可忽略

USE animal_world;

SET @sql1 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'event_end_date') = 0,
  'ALTER TABLE events ADD COLUMN event_end_date DATETIME NULL AFTER event_date',
  'SELECT 1 AS _'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @sql2 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'location_url') = 0,
  'ALTER TABLE events ADD COLUMN location_url VARCHAR(500) NULL COMMENT ''地图定位链接'' AFTER location',
  'SELECT 1 AS _'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
