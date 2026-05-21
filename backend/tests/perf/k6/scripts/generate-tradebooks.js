#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const outDir = process.argv[2] || path.resolve(__dirname, "../data/generated");
const files = parseInt(process.argv[3] || "10", 10);
const rowsPerFile = parseInt(process.argv[4] || "5000", 10);

if (!Number.isFinite(files) || files <= 0) {
  throw new Error("files must be a positive integer");
}
if (!Number.isFinite(rowsPerFile) || rowsPerFile <= 0) {
  throw new Error("rowsPerFile must be a positive integer");
}

fs.mkdirSync(outDir, { recursive: true });

const header = "symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time";

for (let f = 0; f < files; f++) {
  const lines = [header];
  for (let i = 0; i < rowsPerFile; i++) {
    const id = f * 1_000_000 + i;
    const day = String((i % 28) + 1).padStart(2, "0");
    const minute = String(i % 60).padStart(2, "0");
    lines.push([
      `SYM${100 + (i % 500)}`,
      `INE${String(100000 + (i % 500)).padStart(6, "0")}A010${String(i % 90).padStart(2, "0")}`,
      `2024-04-${day}`,
      "NSE",
      "EQ",
      "EQ",
      i % 5 === 0 ? "sell" : "buy",
      "false",
      (1 + (i % 1000) / 10).toFixed(3),
      (10 + (i % 5000) / 7).toFixed(4),
      `T${id}`,
      `O${id}`,
      `2024-04-${day}T09:${minute}:00`,
    ].join(","));
  }

  const target = path.join(outDir, `generated_${String(f + 1).padStart(3, "0")}.csv`);
  fs.writeFileSync(target, lines.join("\n") + "\n", "utf8");
}

console.log(`Generated ${files} file(s) with ${rowsPerFile} row(s) each in ${outDir}`);

