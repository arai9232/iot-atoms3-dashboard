import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

declare global {
  var __db: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (global.__db) return global.__db;

  const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "app.db");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  // WAL mode relies on mmap()'d shared-memory (-shm) files, which crashes
  // (SIGSEGV) on Railway's network-backed volume mounts. Use the default
  // rollback journal instead; this app only ever has one writer process.
  db.exec("PRAGMA journal_mode = DELETE");
  db.exec("PRAGMA mmap_size = 0");
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

  global.__db = db;
  return db;
}

export type Reading = {
  id: number;
  device_id: string;
  temperature: number;
  humidity: number;
  recorded_at: string;
};

export function insertReading(deviceId: string, temperature: number, humidity: number) {
  getDb()
    .prepare(`INSERT INTO readings (device_id, temperature, humidity) VALUES (?, ?, ?)`)
    .run(deviceId, temperature, humidity);
}

export function getRecentReadings(limit: number): Reading[] {
  const rows = getDb()
    .prepare(
      `SELECT id, device_id, temperature, humidity, recorded_at
       FROM readings
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as unknown as Reading[];
  return rows.reverse();
}

export function getLatestReading(): Reading | undefined {
  return getDb()
    .prepare(
      `SELECT id, device_id, temperature, humidity, recorded_at
       FROM readings
       ORDER BY id DESC
       LIMIT 1`
    )
    .get() as unknown as Reading | undefined;
}
