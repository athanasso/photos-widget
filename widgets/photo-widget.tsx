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
async function getImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    // If it's already a data URI, return it
    if (imagePath.startsWith("data:")) {
      return imagePath;
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
    // Use custom click action if slideshow mode to rotate photos
    const clickAction = widgetData.displayMode === "slideshow" && widgetData.photos.length > 1
      ? "NEXT_PHOTO"
      : "OPEN_APP";

    renderWidget(
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          backgroundColor: "#000000",
          borderRadius: 16,
          overflow: "hidden",
        }}
        clickAction={clickAction}
        clickActionData={{ action: "next" }}
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
  const { widgetAction, widgetInfo, renderWidget } = props;

  switch (widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      await renderPhotoWidget(widgetInfo, renderWidget);
      break;

    case "WIDGET_CLICK":
      // Rotate to next photo when widget is clicked in slideshow mode
      await rotatePhoto();
      await renderPhotoWidget(widgetInfo, renderWidget);
      break;

    case "WIDGET_DELETED":
      // Widget was removed, nothing to do
      break;

    default:
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
    return (
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          backgroundColor: "#000000",
          borderRadius: 16,
          overflow: "hidden",
        }}
        clickAction="OPEN_APP"
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

