/**
 * Widget Updater Service
 * Handles automatic widget updates using expo-task-manager for periodic rotation
 */

import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import {
  getWidgetData,
  requestWidgetUpdate,
  rotateToNextPhoto,
} from "./widget-storage";

// Task name for widget updates
export const WIDGET_UPDATE_TASK = "WIDGET_AUTO_UPDATE";

/**
 * Define the widget update task
 * This will be called periodically by the system
 */
TaskManager.defineTask(WIDGET_UPDATE_TASK, async () => {
  console.log("[WidgetUpdater] Task executed at", new Date().toISOString());

  try {
    const widgetData = await getWidgetData();

    if (!widgetData || widgetData.photos.length === 0) {
      console.log("[WidgetUpdater] No widget data available");
      return;
    }

    console.log(
      `[WidgetUpdater] Current: ${widgetData.currentIndex}, Total: ${widgetData.photos.length}, Mode: ${widgetData.displayMode}`
    );

    // If slideshow mode with multiple photos, rotate to next
    if (
      widgetData.displayMode === "slideshow" &&
      widgetData.photos.length > 1
    ) {
      await rotateToNextPhoto();
      await requestWidgetUpdate();
      console.log("[WidgetUpdater] Rotated to next photo and updated widget");
    } else {
      // Just refresh the widget
      await requestWidgetUpdate();
      console.log("[WidgetUpdater] Refreshed widget display");
    }
  } catch (error) {
    console.error("[WidgetUpdater] Task failed:", error);
  }
});

/**
 * Trigger an immediate widget update
 * Call this when photos are added/changed or when app opens
 */
export async function triggerWidgetUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    console.log("[WidgetUpdater] Triggering immediate widget update");
    await requestWidgetUpdate();
  } catch (error) {
    console.error("[WidgetUpdater] Failed to trigger update:", error);
  }
}

/**
 * Rotate to next photo and update widget
 * Call this from the "Next Photo" button
 */
export async function rotateAndUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const widgetData = await getWidgetData();

    if (!widgetData || widgetData.photos.length <= 1) {
      console.log("[WidgetUpdater] Not enough photos to rotate");
      return;
    }

    await rotateToNextPhoto();
    await requestWidgetUpdate();
    console.log("[WidgetUpdater] Manual rotation completed");
  } catch (error) {
    console.error("[WidgetUpdater] Failed to rotate and update:", error);
    throw error;
  }
}
