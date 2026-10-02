"use server";

import { revalidatePath } from "next/cache";
import { updateDeviceSettings } from "@/lib/db";

function parseNullableNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function updateDeviceSettingsAction(formData: FormData) {
  const deviceId = formData.get("device_id");
  if (typeof deviceId !== "string" || !deviceId) {
    throw new Error("device_id is required");
  }

  const displayNameRaw = formData.get("display_name");
  const displayName =
    typeof displayNameRaw === "string" && displayNameRaw.trim() ? displayNameRaw.trim() : null;

  updateDeviceSettings(deviceId, {
    displayName,
    hidden: formData.get("hidden") === "on",
    tempMin: parseNullableNumber(formData.get("temp_min")),
    tempMax: parseNullableNumber(formData.get("temp_max")),
    humidityMin: parseNullableNumber(formData.get("humidity_min")),
    humidityMax: parseNullableNumber(formData.get("humidity_max")),
  });

  revalidatePath("/admin");
}
