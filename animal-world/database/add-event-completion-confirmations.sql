-- 活动完成需全体参与者（含举办者）确认
-- 执行：Get-Content database/add-event-completion-confirmations.sql | mysql -u app -papp123 animal_world

USE animal_world;

CREATE TABLE IF NOT EXISTS event_completion_confirmations (
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
