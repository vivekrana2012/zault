const DEFAULT_HEADER = "symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time";

export function loadUsers(csvPath) {
  const content = open(csvPath);
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new Error(`Users CSV must include header and at least one user row: ${csvPath}`);
  }

  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const usernameIdx = header.indexOf("username");
  const emailIdx = header.indexOf("email");
  const passwordIdx = header.indexOf("password");
  if (usernameIdx < 0 || emailIdx < 0 || passwordIdx < 0) {
    throw new Error("Users CSV header must contain username,email,password");
  }

  const users = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((s) => s.trim());
    if (!cols[usernameIdx] || !cols[emailIdx] || !cols[passwordIdx]) {
      continue;
    }
    users.push({
      username: cols[usernameIdx],
      email: cols[emailIdx],
      password: cols[passwordIdx],
      displayName: cols[usernameIdx],
    });
  }

  if (users.length === 0) {
    throw new Error(`No valid users loaded from ${csvPath}`);
  }
  return users;
}

export function userForVu(users, vuId) {
  const index = (vuId - 1) % users.length;
  return users[index];
}

export function buildTradebookCsv(rowCount, seed) {
  const rows = [DEFAULT_HEADER];
  const now = new Date("2024-01-01T09:15:00Z");
  for (let i = 0; i < rowCount; i++) {
    const idx = seed * 1_000_000 + i;
    const day = String((i % 28) + 1).padStart(2, "0");
    const hour = String(9 + (i % 6)).padStart(2, "0");
    const minute = String(i % 60).padStart(2, "0");
    const second = String((i * 7) % 60).padStart(2, "0");
    const symbolNum = (i % 400) + 100;
    const symbol = `SYM${symbolNum}`;
    const isin = `INE${String(100000 + symbolNum).padStart(6, "0")}A010${String(i % 90).padStart(2, "0")}`;
    const tradeType = i % 5 === 0 ? "sell" : "buy";
    const quantity = (1 + (i % 1000) / 10).toFixed(3);
    const price = (10 + (i % 5000) / 7).toFixed(4);
    const tradeDate = `2024-04-${day}`;
    const time = `2024-04-${day}T${hour}:${minute}:${second}`;
    rows.push(
      [
        symbol,
        isin,
        tradeDate,
        "NSE",
        "EQ",
        "EQ",
        tradeType,
        "false",
        quantity,
        price,
        `T${idx}`,
        `O${idx}`,
        time,
      ].join(",")
    );
  }
  return rows.join("\n") + "\n";
}


