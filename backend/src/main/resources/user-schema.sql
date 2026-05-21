-- User-level database schema (used to build the template-user.db)

CREATE TABLE IF NOT EXISTS user_db_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investments_category ON investments(category);

CREATE TABLE IF NOT EXISTS tradebook_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
    trade_id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    isin TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    exchange TEXT NOT NULL,
    segment TEXT NOT NULL,
    series TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    auction INTEGER NOT NULL,
    quantity TEXT NOT NULL,
    price TEXT NOT NULL,
    order_id TEXT NOT NULL,
    order_execution_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_isin ON trades(isin);
CREATE INDEX IF NOT EXISTS idx_trades_file_id ON trades(file_id);

CREATE TABLE IF NOT EXISTS allocations (
    isin TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    net_quantity TEXT NOT NULL,
    invested_amount TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

