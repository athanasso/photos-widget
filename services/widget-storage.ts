/**
 * Widget Storage Service
 * Handles data sharing between app and widget via SharedPreferences (Android)
 */

import * as FileSystem from "expo-file-system/legacy";
import { NativeModules, Platform } from "react-native";

// Widget data keys
const WIDGET_PREFS_NAME = "PhotoWidgetPrefs";
const KEY_SELECTED_PHOTOS = "selected_photos";
const KEY_CURRENT_INDEX = "current_photo_index";
const KEY_DISPLAY_MODE = "display_mode";
const KEY_LAST_UPDATED = "last_updated";
const KEY_SELECTED_ALBUM_ID = "selected_album_id";

export type DisplayMode = "single" | "slideshow";

export interface WidgetPhoto {
  id: string;
  url: string;
  localPath?: string;
  baseUrl?: string;
  width: number;
  height: number;
}

export interface WidgetData {
  photos: WidgetPhoto[];
  currentIndex: number;
  displayMode: DisplayMode;
  lastUpdated: number;
  albumId?: string;
}

// Native module for SharedPreferences (will be available after prebuild)
const SharedPreferencesModule = NativeModules.SharedPreferencesModule;

/**
 * Get widget cache directory
 */
function getWidgetCacheDir(): string {
  return `${FileSystem.cacheDirectory}widget-photos/`;
}

/**
 * Ensure widget cache directory exists
 */
async function ensureWidgetCacheDir(): Promise<void> {
  const dir = getWidgetCacheDir();
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Save widget data directly
 */
async function saveWidgetData(widgetData: WidgetData): Promise<void> {
  try {
    // Use native SharedPreferences module if available
    if (SharedPreferencesModule?.setWidgetData) {
      await SharedPreferencesModule.setWidgetData(
        WIDGET_PREFS_NAME,
        JSON.stringify(widgetData),
      );
    } else {
      // Fallback: Save to file that native widget can read
      const dataPath = `${FileSystem.documentDirectory}widget-data.json`;
      await FileSystem.writeAsStringAsync(dataPath, JSON.stringify(widgetData));
    }
    console.log("Widget data saved successfully");
  } catch (error) {
    console.error("Failed to save widget data:", error);
    throw error;
  }
}

/**
 * Save selected photos to SharedPreferences for widget access
 */
export async function saveWidgetPhotos(
  photos: WidgetPhoto[],
  displayMode: DisplayMode = "single",
  albumId?: string,
): Promise<void> {
  if (Platform.OS !== "android") return;

  const widgetData: WidgetData = {
    photos,
    currentIndex: 0,
    displayMode,
    lastUpdated: Date.now(),
    albumId,
  };

  await saveWidgetData(widgetData);
  console.log("Widget photos saved successfully");
}

/**
 * Get current widget data
 */
export async function getWidgetData(): Promise<WidgetData | null> {
  if (Platform.OS !== "android") return null;

  try {
    if (SharedPreferencesModule?.getWidgetData) {
      const data =
        await SharedPreferencesModule.getWidgetData(WIDGET_PREFS_NAME);
      return data ? JSON.parse(data) : null;
    } else {
      // Fallback: Read from file
      const dataPath = `${FileSystem.documentDirectory}widget-data.json`;
      const fileInfo = await FileSystem.getInfoAsync(dataPath);
      if (!fileInfo.exists) return null;

      const content = await FileSystem.readAsStringAsync(dataPath);
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to get widget data:", error);
    return null;
  }
}

/**
 * Update current photo index for slideshow mode
 */
export async function updateCurrentPhotoIndex(index: number): Promise<void> {
  if (Platform.OS !== "android") return;

  const widgetData = await getWidgetData();
  if (!widgetData) return;

  widgetData.currentIndex = index;
  widgetData.lastUpdated = Date.now();

  // Save without resetting currentIndex
  await saveWidgetData(widgetData);
  console.log(`Photo index updated to ${index}`);
}

/**
 * Rotate to next photo in slideshow
 */
export async function rotateToNextPhoto(): Promise<void> {
  const widgetData = await getWidgetData();
  if (!widgetData || widgetData.photos.length === 0) return;

  const nextIndex = (widgetData.currentIndex + 1) % widgetData.photos.length;
  await updateCurrentPhotoIndex(nextIndex);
}

/**
 * Clear all widget data
 */
export async function clearWidgetData(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    // Clear SharedPreferences
    if (SharedPreferencesModule?.clearWidgetData) {
      await SharedPreferencesModule.clearWidgetData(WIDGET_PREFS_NAME);
    }

    // Clear cached files
    const cacheDir = getWidgetCacheDir();
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    }

    // Clear data file
    const dataPath = `${FileSystem.documentDirectory}widget-data.json`;
    const fileInfo = await FileSystem.getInfoAsync(dataPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(dataPath);
    }
  } catch (error) {
    console.error("Failed to clear widget data:", error);
  }
}
/**
 * Request widget update (Android only)
 * Uses the renderWidget callback API as required by the library
 */
export async function requestWidgetUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;
  
  try {
    const { requestWidgetUpdate: updateWidget } = require("react-native-android-widget");
    const { renderWidgetForUpdate } = require("@/widgets/photo-widget");
    
    await updateWidget({
      widgetName: "PhotoWidget",
      renderWidget: renderWidgetForUpdate,
    });
    console.log("Widget update requested successfully");
  } catch (error) {
    console.log("Widget update failed:", error);
  }
}

