-- 创建 ai_processed_data 表的SQL语句
CREATE TABLE IF NOT EXISTS ai_processed_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_entry_id INTEGER,
  date TEXT NOT NULL,
  mood_score INTEGER,
  mood_emoji TEXT,
  mood_description TEXT,
  life_score INTEGER,
  study_score INTEGER,
  work_score INTEGER,
  inspiration_score INTEGER,
  summary TEXT,
  ai_model TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(raw_entry_id)
);
