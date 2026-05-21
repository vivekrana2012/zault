#!/usr/bin/env node

/**
 * Performance Test Cleanup Script
 *
 * This script removes test users created during performance testing:
 * 1. Deletes test user records from the main zault.db
 * 2. Removes per-user database files from ./data/users/
 *
 * Usage: npm run test:perf:cleanup
 * or: node ./cleanup-perf-tests.js
 */

const fs = require("fs");
const path = require("path");
const sqlite3 = require("better-sqlite3");

const DATA_DIR = path.resolve(__dirname, "../data");
const MAIN_DB_PATH = path.join(DATA_DIR, "zault.db");
const USERS_CSV_PATH = path.join(DATA_DIR, "users.csv");
const USERS_DB_DIR = path.join(DATA_DIR, "users");

// Load test user usernames from CSV
function loadTestUsernames() {
  if (!fs.existsSync(USERS_CSV_PATH)) {
    console.error(`❌ Users CSV not found at: ${USERS_CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(USERS_CSV_PATH, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    console.error("❌ Users CSV is empty or malformed");
    process.exit(1);
  }

  const header = lines[0].toLowerCase().split(",").map((s) => s.trim());
  const usernameIdx = header.indexOf("username");
  if (usernameIdx < 0) {
    console.error("❌ Users CSV must contain 'username' column");
    process.exit(1);
  }

  const usernames = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((s) => s.trim());
    if (cols[usernameIdx]) {
      usernames.push(cols[usernameIdx]);
    }
  }

  return usernames;
}

// Delete users from main database
function deleteUsersFromMainDb(usernames) {
  if (!fs.existsSync(MAIN_DB_PATH)) {
    console.warn(`⚠️  Main database not found: ${MAIN_DB_PATH}`);
    return [];
  }

  try {
    const db = new sqlite3(MAIN_DB_PATH);

    // Get user IDs for the usernames
    const getUserIdStmt = db.prepare("SELECT id FROM users WHERE username = ?");
    const deleteUserStmt = db.prepare("DELETE FROM users WHERE username = ?");

    let deletedIds = [];
    let deletedCount = 0;

    for (const username of usernames) {
      try {
        const user = getUserIdStmt.get(username);
        if (user) {
          deleteUserStmt.run(username);
          deletedIds.push(user.id);
          deletedCount++;
          console.log(`  ✓ Deleted user: ${username}`);
        } else {
          console.log(`  - User not found: ${username}`);
        }
      } catch (err) {
        console.error(`  ✗ Error deleting user ${username}: ${err.message}`);
      }
    }

    db.close();
    console.log(`\n✅ Deleted ${deletedCount}/${usernames.length} test users from main database\n`);
    return deletedIds;
  } catch (err) {
    console.error(`❌ Failed to connect to main database: ${err.message}`);
    process.exit(1);
  }
}

// Remove user database files
function removeUserDatabaseFiles(userIds) {
  if (!fs.existsSync(USERS_DB_DIR)) {
    console.warn(`⚠️  Users database directory not found: ${USERS_DB_DIR}`);
    return;
  }

  let deletedCount = 0;
  let remainingCount = 0;

  // Try to delete files for known user IDs
  for (const userId of userIds) {
    const dbPath = path.join(USERS_DB_DIR, `${userId}.db`);
    const shmPath = `${dbPath}-shm`;
    const walPath = `${dbPath}-wal`;

    for (const filePath of [dbPath, shmPath, walPath]) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`  ✓ Deleted: ${path.basename(filePath)}`);
          deletedCount++;
        } catch (err) {
          console.error(`  ✗ Failed to delete ${path.basename(filePath)}: ${err.message}`);
        }
      }
    }
  }

  // Clean up any orphaned files from users.csv but missing from DB
  try {
    const files = fs.readdirSync(USERS_DB_DIR);
    for (const file of files) {
      if (file.endsWith(".db")) {
        const userId = file.replace(".db", "");
        const filePath = path.join(USERS_DB_DIR, file);
        // Only delete .db files, not -shm or -wal (they'll be cleaned up above)
        if (!userIds.includes(userId) && file.endsWith(".db")) {
          try {
            fs.unlinkSync(filePath);
            console.log(`  ✓ Cleaned orphaned: ${file}`);
            remainingCount++;
          } catch (err) {
            console.error(`  ✗ Failed to delete ${file}: ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`⚠️  Could not scan user DB directory: ${err.message}`);
  }

  console.log(`\n✅ Removed ${deletedCount} user database files`);
  if (remainingCount > 0) {
    console.log(`✅ Cleaned ${remainingCount} orphaned files\n`);
  } else {
    console.log("");
  }
}

// Main cleanup flow
function main() {
  console.log("\n🧹 Starting Performance Test Cleanup...\n");

  const usernames = loadTestUsernames();
  console.log(`📋 Found ${usernames.length} test users to clean up:`);
  for (const username of usernames) {
    console.log(`   - ${username}`);
  }
  console.log("");

  console.log("🗑️  Deleting users from main database...");
  const userIds = deleteUsersFromMainDb(usernames);

  if (userIds.length > 0) {
    console.log("🗑️  Removing per-user database files...");
    removeUserDatabaseFiles(userIds);
  }

  console.log("✨ Cleanup complete!");
  console.log(`   Test data has been removed from: ${MAIN_DB_PATH}`);
  console.log(`   User databases cleaned from: ${USERS_DB_DIR}\n`);
}

main();

