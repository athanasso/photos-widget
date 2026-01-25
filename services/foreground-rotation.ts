/**
 * Foreground Rotation Service
 * TypeScript wrapper for the native Android foreground service
 * that provides reliable short-interval widget photo rotation
 */

import { NativeModules, Platform } from "react-native";

const { WidgetRotationModule } = NativeModules;

export interface RotationServiceStatus {
  isRunning: boolean;
  intervalSeconds: number | null;
}

/**
 * Start the foreground rotation service
 * This will show a persistent notification but allows for precise timing
 * @param intervalSeconds - Rotation interval in seconds (minimum 10)
 */
export async function startRotationService(intervalSeconds: number): Promise<boolean> {
  if (Platform.OS !== "android") {
    console.warn("[RotationService] Only available on Android");
    return false;
  }

  if (!WidgetRotationModule) {
    console.error("[RotationService] Native module not available");
    return false;
  }

  try {
    // Enforce minimum interval of 10 seconds
    const interval = Math.max(10, intervalSeconds);
    console.log(`[RotationService] Starting with interval: ${interval}s`);
    
    const result = await WidgetRotationModule.startRotationService(interval);
    console.log("[RotationService] Service started:", result);
    return result;
  } catch (error) {
    console.error("[RotationService] Failed to start:", error);
    throw error;
  }
}

/**
 * Stop the foreground rotation service
 */
export async function stopRotationService(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  if (!WidgetRotationModule) {
    console.error("[RotationService] Native module not available");
    return false;
  }

  try {
    console.log("[RotationService] Stopping service...");
    const result = await WidgetRotationModule.stopRotationService();
    console.log("[RotationService] Service stopped:", result);
    return result;
  } catch (error) {
    console.error("[RotationService] Failed to stop:", error);
    throw error;
  }
}

/**
 * Check if the rotation service is currently running
 */
export async function isRotationServiceRunning(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  if (!WidgetRotationModule) {
    return false;
  }

  try {
    return await WidgetRotationModule.isServiceRunning();
  } catch (error) {
    console.error("[RotationService] Failed to check status:", error);
    return false;
  }
}

/**
 * Toggle the rotation service on/off
 * @param enabled - Whether to enable or disable
 * @param intervalSeconds - Interval in seconds if enabling
 */
export async function toggleRotationService(
  enabled: boolean,
  intervalSeconds: number = 30
): Promise<boolean> {
  if (enabled) {
    return startRotationService(intervalSeconds);
  } else {
    return stopRotationService();
  }
}
