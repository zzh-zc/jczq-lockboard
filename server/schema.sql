CREATE TABLE IF NOT EXISTS jc_match_lock (
  issue_date TEXT NOT NULL,
  slot TEXT NOT NULL,
  code TEXT,
  league TEXT,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  match_date TEXT,
  kickoff TEXT,
  sp TEXT,
  pick TEXT,
  dual INTEGER DEFAULT 0,
  tag TEXT,
  env TEXT,
  paper_oppose INTEGER DEFAULT 0,
  ttg_picks TEXT,
  ft_scores TEXT,
  hafu_picks TEXT,
  had_picks TEXT,
  hhad_picks TEXT,
  summary TEXT,
  factors TEXT,
  score TEXT,
  result TEXT,
  ht_score TEXT,
  sealed INTEGER NOT NULL DEFAULT 1,
  sealed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (issue_date, slot)
);

CREATE INDEX IF NOT EXISTS idx_jc_issue ON jc_match_lock(issue_date);
CREATE INDEX IF NOT EXISTS idx_jc_slot ON jc_match_lock(slot);
