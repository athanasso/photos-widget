/**
 * Photo Widget Component (Android)
 * Renders the widget using react-native-android-widget
 */

import * as FileSystem from "expo-file-system/legacy";
import React from "react";
import {
    FlexWidget,
    ImageWidget,
    TextWidget,
    type WidgetTaskHandlerProps,
} from "react-native-android-widget";

interface WidgetData {
  photos: {
    id: string;
    url: string;
    localPath?: string;
    baseUrl?: string;
    width: number;
    height: number;
  }[];
  currentIndex: number;
  displayMode: "single" | "slideshow";
  lastUpdated: number;
  albumId?: string;
}

/**
 * Get widget data from file storage
 */
async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const dataPath = `${FileSystem.documentDirectory}widget-data.json`;
    const fileInfo = await FileSystem.getInfoAsync(dataPath);

    if (!fileInfo.exists) {
      return null;
    }

    const content = await FileSystem.readAsStringAsync(dataPath);
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to get widget data:", error);
    return null;
  }
}

/**
 * Save widget data
 */
async function saveWidgetData(widgetData: WidgetData): Promise<void> {
  try {
    const dataPath = `${FileSystem.documentDirectory}widget-data.json`;
    await FileSystem.writeAsStringAsync(dataPath, JSON.stringify(widgetData));
  } catch (error) {
    console.error("Failed to save widget data:", error);
  }
}

/**
 * Rotate to next photo
 */
async function rotatePhoto(): Promise<void> {
  const widgetData = await getWidgetData();
  if (!widgetData || widgetData.photos.length <= 1) return;

  widgetData.currentIndex = (widgetData.currentIndex + 1) % widgetData.photos.length;
  widgetData.lastUpdated = Date.now();
  await saveWidgetData(widgetData);
}

/**
 * Convert image to base64 for widget display
 */
async function getImageAsBase64(imagePath: string): Promise<`data:image${string}` | null> {
  try {
    // If it's already a data URI, return it
    if (imagePath.startsWith("data:image")) {
      return imagePath as `data:image${string}`;
    }

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imagePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return null;
  }
}

/**
 * Render the photo widget
 */
async function renderPhotoWidget(
  widgetInfo: { width: number; height: number },
  renderWidget: (widget: React.ReactElement) => void
): Promise<void> {
  const widgetData = await getWidgetData();

  if (!widgetData || widgetData.photos.length === 0) {
    renderWidget(
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a2e",
          borderRadius: 16,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="📷"
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        />
        <TextWidget
          text="Tap to add photos"
          style={{
            fontSize: 14,
            color: "#ffffff",
          }}
        />
      </FlexWidget>
    );
    return;
  }

  const currentPhoto =
    widgetData.photos[widgetData.currentIndex] || widgetData.photos[0];
  const imagePath = currentPhoto.localPath || currentPhoto.url;

  // Try to get image as base64 for reliable display
  const base64Image = await getImageAsBase64(imagePath);

  if (base64Image) {
    // Always use ROTATE_PHOTO action to enable tap-to-rotate
    renderWidget(
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          backgroundColor: "#000000",
          borderRadius: 16,
          overflow: "hidden",
        }}
        clickAction="ROTATE_PHOTO"
        clickActionData={{ action: "rotate" }}
      >
        <ImageWidget
          image={base64Image}
          imageWidth={widgetInfo.width}
          imageHeight={widgetInfo.height}
          style={{
            width: "match_parent",
            height: "match_parent",
          }}
        />
      </FlexWidget>
    );
  } else {
    // Fallback to showing error state
    renderWidget(
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a2e",
          borderRadius: 16,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="⚠️"
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        />
        <TextWidget
          text="Unable to load photo"
          style={{
            fontSize: 14,
            color: "#ffffff",
          }}
        />
      </FlexWidget>
    );
  }
}

/**
 * Widget task handler for react-native-android-widget
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget, clickAction, clickActionData } = props;
  
  console.log("[PhotoWidget] Task handler called:", {
    widgetAction,
    clickAction,
    clickActionData,
    widgetId: widgetInfo.widgetId,
  });

  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      console.log("[PhotoWidget] Rendering widget for:", widgetAction);
      await renderPhotoWidget(widgetInfo, renderWidget);
      break;

    case "WIDGET_CLICK":
      // Handle click action - rotate to next photo
      console.log("[PhotoWidget] Widget clicked! clickAction:", clickAction);
      if (clickAction === "ROTATE_PHOTO") {
        console.log("[PhotoWidget] Rotating to next photo...");
        await rotatePhoto();
        await renderPhotoWidget(widgetInfo, renderWidget);
        console.log("[PhotoWidget] Photo rotated and widget updated");
      } else {
        // Unknown click action, still try to rotate
        console.log("[PhotoWidget] Unknown clickAction, rotating anyway");
        await rotatePhoto();
        await renderPhotoWidget(widgetInfo, renderWidget);
      }
      break;

    case "WIDGET_DELETED":
      console.log("[PhotoWidget] Widget deleted");
      break;

    default:
      console.log("[PhotoWidget] Unknown widget action:", widgetAction);
      break;
  }
}

/**
 * Render widget for update API
 * This returns a React element directly as required by requestWidgetUpdate
 */
export async function renderWidgetForUpdate(widgetInfo: { width: number; height: number }): Promise<React.ReactElement> {
  const widgetData = await getWidgetData();

  if (!widgetData || widgetData.photos.length === 0) {
    return (
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a2e",
          borderRadius: 16,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="📷"
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        />
        <TextWidget
          text="Tap to add photos"
          style={{
            fontSize: 14,
            color: "#ffffff",
          }}
        />
      </FlexWidget>
    );
  }

  const currentPhoto =
    widgetData.photos[widgetData.currentIndex] || widgetData.photos[0];
  const imagePath = currentPhoto.localPath || currentPhoto.url;

  // Try to get image as base64 for reliable display
  const base64Image = await getImageAsBase64(imagePath);

  if (base64Image) {
    // Use ROTATE_PHOTO action to enable tap-to-rotate on home screen
    return (
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          backgroundColor: "#000000",
          borderRadius: 16,
          overflow: "hidden",
        }}
        clickAction="ROTATE_PHOTO"
        clickActionData={{ action: "rotate" }}
      >
        <ImageWidget
          image={base64Image}
          imageWidth={widgetInfo.width}
          imageHeight={widgetInfo.height}
          style={{
            width: "match_parent",
            height: "match_parent",
          }}
        />
      </FlexWidget>
    );
  }

  // Fallback error state
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a2e",
        borderRadius: 16,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="⚠️"
        style={{
          fontSize: 48,
          marginBottom: 8,
        }}
      />
      <TextWidget
        text="Unable to load"
        style={{
          fontSize: 14,
          color: "#ffffff",
        }}
      />
    </FlexWidget>
  );
}

/**
 * Main widget component (for preview purposes)
 */
export function PhotoWidgetComponent() {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a2e",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <TextWidget
        text="📷"
        style={{
          fontSize: 64,
          marginBottom: 16,
        }}
      />
      <TextWidget
        text="Photo Widget"
        style={{
          fontSize: 20,
          color: "#ffffff",
          marginBottom: 8,
        }}
      />
      <TextWidget
        text="Open app to add photos"
        style={{
          fontSize: 14,
          color: "#aaaaaa",
        }}
      />
    </FlexWidget>
  );
}

export default PhotoWidgetComponent;

