-- =============================================================================
-- Zault — Main Database Schema (zault.db)
-- Managed by Spring SQL init (spring.sql.init.mode=always).
-- Hibernate DDL is disabled (ddl-auto=none); this file owns schema creation.
-- All statements use IF NOT EXISTS — safe to re-run on every startup.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users
-- Stores all application user accounts.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             TEXT         PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(72)  NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    display_name   VARCHAR(100),
    email_verified BOOLEAN      NOT NULL DEFAULT 0,
    failed_attempts INTEGER     NOT NULL DEFAULT 0,
    lockout_until  TIMESTAMP,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

