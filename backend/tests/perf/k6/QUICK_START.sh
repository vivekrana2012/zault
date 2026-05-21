#!/bin/bash
# Quick Reference: Performance Test Cleanup

echo "
╔════════════════════════════════════════════════════════════════════════════╗
║                 PERFORMANCE TEST CLEANUP - QUICK REFERENCE                 ║
╚════════════════════════════════════════════════════════════════════════════╝

📋 SETUP COMPLETE:
   ✅ Test users CSV: data/users.csv (10 test users created)
   ✅ Cleanup shell script: tests/perf/k6/cleanup-perf-tests.sh (executable)
   ✅ Cleanup Node script: tests/perf/k6/cleanup-perf-tests.js
   ✅ Cleanup library: tests/perf/k6/lib/cleanup.js
   ✅ Test teardown updated: mixed.js and upload.js

🚀 RUNNING TESTS:

   Mixed workload:
   $ cd tests/perf/k6
   $ k6 run scenarios/mixed.js

   Upload-heavy:
   $ cd tests/perf/k6
   $ k6 run scenarios/upload.js

   Custom configuration:
   $ BASE_URL=http://localhost:8080 VUS=10 DURATION=5m k6 run scenarios/mixed.js

🧹 CLEANUP (pick one method):

   METHOD 1 - Shell Script (recommended):
   $ cd tests/perf/k6
   $ ./cleanup-perf-tests.sh

   METHOD 2 - Node.js:
   $ cd tests/perf/k6
   $ node ./cleanup-perf-tests.js

   METHOD 3 - Manual (macOS/Linux with sqlite3):
   $ sqlite3 data/zault.db \"DELETE FROM users WHERE username LIKE 'perfuser%';\"
   $ rm -rf data/users/*.db data/users/*.db-{shm,wal}

⚠️  IMPORTANT NOTES:

   • Test users are ONLY created when you run setup() phase
   • setup() runs automatically at start of k6 test
   • teardown() runs after test completes (prints cleanup instructions)
   • ALWAYS cleanup after testing to avoid database pollution
   • Cleanup scripts are idempotent (safe to run multiple times)

📊 WHAT CLEANUP REMOVES:

   ✓ User records from main database (data/zault.db)
   ✓ Per-user SQLite databases (data/users/{userId}.db)
   ✓ Associated WAL and SHM files
   ✓ Does NOT remove trade data (leave for audit trail)

📖 DOCUMENTATION:

   • Full guide: tests/perf/k6/README.md
   • Implementation details: tests/perf/k6/CLEANUP_IMPLEMENTATION.md
   • Config options: tests/perf/k6/lib/config.js

🔧 TROUBLESHOOTING:

   Q: \"register failed: 500\"
   A: Check backend is running, verify BASE_URL

   Q: \"sqlite3: command not found\"
   A: Install sqlite3 (brew install sqlite3) or use Node script

   Q: \"Permission denied\" on cleanup script
   A: Run: chmod +x tests/perf/k6/cleanup-perf-tests.sh

   Q: \"Users already deleted\"
   A: Safe to ignore - cleanup script handles this gracefully

═══════════════════════════════════════════════════════════════════════════════
"

