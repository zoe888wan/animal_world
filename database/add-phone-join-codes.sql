-- 活动报名手机验证码表（用于验证身份）
-- 执行：mysql -u app -papp123 animal_world < add-phone-join-codes.sql

USE animal_world;

CREATE TABLE IF NOT EXISTS phone_join_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  INDEX idx_join_code_lookup (event_id, phone, code)
);
