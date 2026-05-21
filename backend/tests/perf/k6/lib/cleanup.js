import http from "k6/http";
import { config } from "./config.js";

/**
 * Cleanup function to remove test data after performance tests.
 * This should be called in the teardown() phase of k6 scenarios.
 */
export function cleanupTestUsers(users) {
  if (!users || users.length === 0) {
    console.log("No test users to clean up");
    return;
  }

  console.log(`Starting cleanup of ${users.length} test users...`);
  let deleted = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Attempt to delete user via API (if such endpoint exists)
      // For now, we log the usernames that would need cleanup
      console.log(`[CLEANUP] User ${user.username} (email: ${user.email}) should be deleted from system`);
      deleted++;
    } catch (err) {
      console.error(`[CLEANUP] Failed to cleanup user ${user.username}: ${err}`);
      failed++;
    }
  }

  console.log(`Cleanup complete: ${deleted} users processed, ${failed} failures`);
}

/**
 * Alternative: Delete all per-user database files that were created during the test.
 * This is called via a separate cleanup script, not from k6.
 */
export function logCleanupInstructions(users) {
  console.log("\n=== CLEANUP REQUIRED ===");
  console.log("The following test users should be deleted from the database:");
  for (const user of users) {
    console.log(`  - ${user.username} (${user.email})`);
  }
  console.log("\nTheir user database files are located at: ./data/users/{userId}.db");
  console.log("Run the cleanup script to remove them: npm run test:perf:cleanup");
  console.log("======================\n");
}

