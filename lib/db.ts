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
    CREATE INDEX IF NOT EXISTS idx_readings_device_id_id ON readings (device_id, id);

    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      display_name TEXT,
      hidden INTEGER NOT NULL DEFAULT 0,
      temp_min REAL,
      temp_max REAL,
      humidity_min REAL,
      humidity_max REAL
    );

    CREATE TABLE IF NOT EXISTS login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT,
      success INTEGER NOT NULL,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  // Backfill devices that already had readings before the devices table existed,
  // so they don't silently vanish from getVisibleDevices()/getAllDevices().
  db.exec(`INSERT OR IGNORE INTO devices (device_id) SELECT DISTINCT device_id FROM readings`);

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
  const db = getDb();
  db.prepare(`INSERT OR IGNORE INTO devices (device_id) VALUES (?)`).run(deviceId);
  db.prepare(`INSERT INTO readings (device_id, temperature, humidity) VALUES (?, ?, ?)`).run(
    deviceId,
    temperature,
    humidity
  );
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

export type DeviceMeta = {
  device_id: string;
  display_name: string | null;
  hidden: boolean;
  temp_min: number | null;
  temp_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
};

type DeviceRow = Omit<DeviceMeta, "hidden"> & { hidden: number };

function rowToDeviceMeta(row: DeviceRow): DeviceMeta {
  return { ...row, hidden: row.hidden !== 0 };
}

export function getVisibleDevices(): DeviceMeta[] {
  const rows = getDb()
    .prepare(
      `SELECT device_id, display_name, hidden, temp_min, temp_max, humidity_min, humidity_max
       FROM devices
       WHERE hidden = 0
       ORDER BY device_id ASC`
    )
    .all() as unknown as DeviceRow[];
  return rows.map(rowToDeviceMeta);
}

export function getAllDevices(): DeviceMeta[] {
  const rows = getDb()
    .prepare(
      `SELECT device_id, display_name, hidden, temp_min, temp_max, humidity_min, humidity_max
       FROM devices
       ORDER BY device_id ASC`
    )
    .all() as unknown as DeviceRow[];
  return rows.map(rowToDeviceMeta);
}

export type DeviceSettingsInput = {
  displayName: string | null;
  hidden: boolean;
  tempMin: number | null;
  tempMax: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
};

export function updateDeviceSettings(deviceId: string, settings: DeviceSettingsInput) {
  getDb()
    .prepare(
      `UPDATE devices
       SET display_name = ?, hidden = ?, temp_min = ?, temp_max = ?, humidity_min = ?, humidity_max = ?
       WHERE device_id = ?`
    )
    .run(
      settings.displayName,
      settings.hidden ? 1 : 0,
      settings.tempMin,
      settings.tempMax,
      settings.humidityMin,
      settings.humidityMax,
      deviceId
    );
}

export type LoginEvent = {
  id: number;
  role: string | null;
  success: boolean;
  ip: string | null;
  created_at: string;
};

type LoginEventRow = Omit<LoginEvent, "success"> & { success: number };

export function logLoginAttempt(role: "admin" | "viewer" | null, success: boolean, ip: string | null) {
  getDb()
    .prepare(`INSERT INTO login_events (role, success, ip) VALUES (?, ?, ?)`)
    .run(role, success ? 1 : 0, ip);
}

export function getLoginEvents(limit: number): LoginEvent[] {
  const rows = getDb()
    .prepare(`SELECT id, role, success, ip, created_at FROM login_events ORDER BY id DESC LIMIT ?`)
    .all(limit) as unknown as LoginEventRow[];
  return rows.map((r) => ({ ...r, success: r.success !== 0 }));
}

const MAX_READINGS_PER_DEVICE = 5000;

export function getReadingsInRange(deviceId: string, sinceIso: string, untilIso: string): Reading[] {
  const rows = getDb()
    .prepare(
      `SELECT id, device_id, temperature, humidity, recorded_at
       FROM readings
       WHERE device_id = ? AND recorded_at >= ? AND recorded_at <= ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(deviceId, sinceIso, untilIso, MAX_READINGS_PER_DEVICE) as unknown as Reading[];
  return rows.reverse();
}

export function getEarliestRecordedAt(): string | undefined {
  const row = getDb()
    .prepare(`SELECT MIN(recorded_at) AS earliest FROM readings`)
    .get() as unknown as { earliest: string | null };
  return row.earliest ?? undefined;
}
