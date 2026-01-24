/**
 * Background Fetch Service
 * Handles periodic photo rotation using expo-background-fetch
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { getValidAccessToken } from "./google-auth";
import {
    getWidgetData,
    requestWidgetUpdate,
    rotateToNextPhoto,
} from "./widget-storage";

// Task name for background fetch
export const BACKGROUND_FETCH_TASK = "PHOTO_WIDGET_BACKGROUND_FETCH";

// Minimum interval for background fetch (in seconds)
// Note: On Android, the actual interval is determined by the system
const BACKGROUND_FETCH_INTERVAL = 30 * 60; // 30 minutes

/**
 * Define the background fetch task
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log("[BackgroundFetch] Task executed");

  try {
    const widgetData = await getWidgetData();

    if (!widgetData || widgetData.photos.length === 0) {
      console.log("[BackgroundFetch] No widget data, skipping");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if we have a valid token
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.log("[BackgroundFetch] No valid access token, skipping");
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // If slideshow mode, rotate to next photo
    if (widgetData.displayMode === "slideshow") {
      await rotateToNextPhoto();
      requestWidgetUpdate();
      console.log("[BackgroundFetch] Rotated to next photo");
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundFetch] Task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundFetch(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK,
    );

    if (isRegistered) {
      console.log("[BackgroundFetch] Task already registered");
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: BACKGROUND_FETCH_INTERVAL,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("[BackgroundFetch] Task registered successfully");
  } catch (error) {
    console.error("[BackgroundFetch] Failed to register task:", error);
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK,
    );

    if (!isRegistered) {
      console.log("[BackgroundFetch] Task not registered");
      return;
    }

    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log("[BackgroundFetch] Task unregistered successfully");
  } catch (error) {
    console.error("[BackgroundFetch] Failed to unregister task:", error);
  }
}

/**
 * Check background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
  return await BackgroundFetch.getStatusAsync();
}

/**
 * Check if background fetch is available
 */
export async function isBackgroundFetchAvailable(): Promise<boolean> {
  const status = await getBackgroundFetchStatus();
  return status === BackgroundFetch.BackgroundFetchStatus.Available;
}

/**
 * Get task status
 */
export async function isTaskRegistered(): Promise<boolean> {
  return await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
}
