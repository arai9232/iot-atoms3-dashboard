import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

declare global {
  var __db: Database.Database | undefined;
}

const db = global.__db ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") global.__db = db;

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON readings (recorded_at);
`);

export type Reading = {
  id: number;
  device_id: string;
  temperature: number;
  humidity: number;
  recorded_at: string;
};

const insertStmt = db.prepare(
  `INSERT INTO readings (device_id, temperature, humidity) VALUES (?, ?, ?)`
);

export function insertReading(deviceId: string, temperature: number, humidity: number) {
  insertStmt.run(deviceId, temperature, humidity);
}

const recentStmt = db.prepare(
  `SELECT id, device_id, temperature, humidity, recorded_at
   FROM readings
   ORDER BY id DESC
   LIMIT ?`
);

export function getRecentReadings(limit: number): Reading[] {
  const rows = recentStmt.all(limit) as Reading[];
  return rows.reverse();
}

const latestStmt = db.prepare(
  `SELECT id, device_id, temperature, humidity, recorded_at
   FROM readings
   ORDER BY id DESC
   LIMIT 1`
);

export function getLatestReading(): Reading | undefined {
  return latestStmt.get() as Reading | undefined;
}
