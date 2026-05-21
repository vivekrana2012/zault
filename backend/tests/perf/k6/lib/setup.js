import { loadUsers } from "./data.js";
import { config } from "./config.js";
import { ensureRegistered } from "./auth.js";

const users = loadUsers(config.usersCsvPath);

export function getUsers() {
  return users;
}

export function registerAllUsers() {
  for (const user of users) {
    try {
      ensureRegistered(user);
    } catch (err) {
      // If registration fails with 500 (server error), user might already exist
      // Log and continue - login will fail later if user truly doesn't exist
      console.warn(`Registration warning for ${user.username}: ${err.message || err}`);
    }
  }
  return { users };
}
