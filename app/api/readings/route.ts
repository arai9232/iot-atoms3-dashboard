import { NextRequest, NextResponse } from "next/server";
import { getDeviceIds, getReadingsSince, insertReading } from "@/lib/db";
import { rangeMs } from "@/lib/time-range";

export const runtime = "nodejs";

type ReadingPayload = {
  device_id?: unknown;
  temperature?: unknown;
  humidity?: unknown;
};

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.API_KEY;
  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ReadingPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { temperature, humidity, device_id } = body;
  if (typeof temperature !== "number" || Number.isNaN(temperature)) {
    return NextResponse.json({ error: "temperature must be a number" }, { status: 400 });
  }
  if (typeof humidity !== "number" || Number.isNaN(humidity)) {
    return NextResponse.json({ error: "humidity must be a number" }, { status: 400 });
  }

  const deviceId = typeof device_id === "string" && device_id.trim() ? device_id : "atoms3-env3";

  insertReading(deviceId, temperature, humidity);

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "1d";
  const sinceIso = new Date(Date.now() - rangeMs(rangeParam)).toISOString();

  const devices = getDeviceIds().map((deviceId) => ({
    device_id: deviceId,
    readings: getReadingsSince(deviceId, sinceIso),
  }));

  return NextResponse.json({ devices });
}
