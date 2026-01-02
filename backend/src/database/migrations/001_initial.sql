-- Initial schema migration for exp_track

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  expense TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  total INTEGER NOT NULL,
  payment TEXT NOT NULL,
  by TEXT NOT NULL,
  "to" TEXT NOT NULL,
  remarks TEXT,
  payment_correction TEXT,
  image_url TEXT,
  is_excluded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_payment ON transactions(payment);
CREATE INDEX IF NOT EXISTS idx_transactions_is_excluded ON transactions(is_excluded);
