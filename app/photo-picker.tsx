/**
 * Photo Picker Screen
 * Opens the Google Photos Picker for users to select photos
 */

import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getValidAccessToken } from "@/services/google-auth";
import {
    createPickerSession,
    deletePickerSession,
    fetchPickerMediaItems,
    getPickerSession,
    type MediaItem,
} from "@/services/photos-picker-api";
import {
    requestWidgetUpdate,
    saveWidgetPhotos,
    type DisplayMode,
} from "@/services/widget-storage";
import * as WebBrowser from "expo-web-browser";

type PickerState =
  | "idle"
  | "creating-session"
  | "picker-open"
  | "polling"
  | "fetching-photos"
  | "downloading"
  | "saving"
  | "done"
  | "error";

export default function PhotoPickerScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [state, setState] = useState<PickerState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [displayMode, setDisplayMode] = useState<DisplayMode>("slideshow");

  const startPicker = async () => {
    try {
      setState("creating-session");

      // Create a picker session
      const session = await createPickerSession();
      setSessionId(session.id);
      console.log("Created session:", session.id);
      console.log("Picker URI:", session.pickerUri);

      setState("picker-open");

      // Open the Google Photos picker
      await WebBrowser.openBrowserAsync(session.pickerUri, {
        showInRecents: true,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // User closed the browser - start polling
      setState("polling");
      pollForSelection(session.id);
    } catch (err) {
      console.error("Error starting picker:", err);
      setError(
        err instanceof Error ? err.message : "Failed to open photo picker"
      );
      setState("error");
    }
  };

  const pollForSelection = async (sessId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    console.log("Starting to poll for photo selection...");

    while (attempts < maxAttempts) {
      try {
        console.log(`Polling attempt ${attempts + 1}...`);
        const session = await getPickerSession(sessId);
        console.log(
          "Session state:",
          JSON.stringify(session).substring(0, 200)
        );

        if (session.mediaItemsSet) {
          console.log("Photos selected! Fetching...");
          await fetchSelectedPhotos(sessId);
          return;
        }

        // Wait 5 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch (err) {
        console.error("Error polling session:", err);
        break;
      }
    }

    // Timeout or error
    setError("No photos were selected or the session timed out");
    setState("error");

    // Clean up session
    if (sessId) {
      try {
        await deletePickerSession(sessId);
      } catch {}
    }
  };

  const fetchSelectedPhotos = async (sessId: string) => {
    try {
      setState("fetching-photos");

      const response = await fetchPickerMediaItems(sessId);
      const photos = response.mediaItems || [];

      console.log(`Fetched ${photos.length} selected photos`);
      if (photos.length > 0) {
        console.log("First photo structure:", JSON.stringify(photos[0]));
      }
      setSelectedPhotos(photos);

      if (photos.length > 0) {
        setState("downloading");
        setDownloadProgress({ current: 0, total: photos.length });

        // Download photos to local storage since baseUrls expire after ~60 minutes
        const widgetPhotos = [];

        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          const baseUrl = p.mediaFile?.baseUrl || p.baseUrl || "";
          // Append size parameters for 512x512 cropped image
          const photoUrl = baseUrl ? `${baseUrl}=w512-h512-c` : "";
          console.log(`Downloading photo ${i + 1}/${photos.length}...`);
          setDownloadProgress({ current: i + 1, total: photos.length });

          try {
            // Download the image to local cache
            const localPath = `${FileSystem.cacheDirectory}widget-photos/${p.id}.jpg`;

            // Ensure directory exists
            const dirInfo = await FileSystem.getInfoAsync(
              `${FileSystem.cacheDirectory}widget-photos/`
            );
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(
                `${FileSystem.cacheDirectory}widget-photos/`,
                { intermediates: true }
              );
            }

            // Get fresh access token
            const accessToken = await getValidAccessToken();

            // Download the image with Authorization header
            const downloadResult = await FileSystem.downloadAsync(
              photoUrl,
              localPath,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (downloadResult.status === 200) {
              console.log(`Downloaded photo ${p.id} to ${localPath}`);
              widgetPhotos.push({
                id: p.id,
                url: localPath,
                localPath: localPath,
                baseUrl: baseUrl,
                width: 512,
                height: 512,
              });
            } else {
              console.error(
                `Failed to download photo ${p.id}: status ${downloadResult.status}`
              );
            }
          } catch (err) {
            console.error(`Error downloading photo ${p.id}:`, err);
          }
        }

        if (widgetPhotos.length > 0) {
          setState("saving");
          
          // Save with selected display mode
          await saveWidgetPhotos(widgetPhotos, displayMode);

          // Request widget update (Android only)
          if (Platform.OS === "android") {
            requestWidgetUpdate();
          }

          setState("done");

          Alert.alert(
            "Photos Selected!",
            `${widgetPhotos.length} photo${widgetPhotos.length > 1 ? "s" : ""} saved for your widget in ${displayMode} mode.`,
            [{ text: "OK", onPress: () => router.back() }]
          );
        } else {
          setError("Failed to download photos");
          setState("error");
        }
      } else {
        setError("No photos were selected");
        setState("error");
      }

      // Clean up session
      await deletePickerSession(sessId);
    } catch (err) {
      console.error("Error fetching photos:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch selected photos"
      );
      setState("error");
    }
  };

  const getStatusMessage = () => {
    switch (state) {
      case "idle":
        return "Tap the button below to select photos from your Google Photos library";
      case "creating-session":
        return "Preparing photo picker...";
      case "picker-open":
        return "Select photos in the Google Photos picker, then close the browser";
      case "polling":
        return "Waiting for you to finish selecting photos...";
      case "fetching-photos":
        return "Loading selected photos...";
      case "downloading":
        return `Downloading photo ${downloadProgress.current} of ${downloadProgress.total}...`;
      case "saving":
        return "Saving photos for widget...";
      case "done":
        return "Photos saved successfully!";
      case "error":
        return error || "An error occurred";
      default:
        return "";
    }
  };

  const isLoading = [
    "creating-session",
    "polling",
    "fetching-photos",
    "downloading",
    "saving",
  ].includes(state);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Select Photos
        </ThemedText>

        <ThemedText style={styles.description}>{getStatusMessage()}</ThemedText>

        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            {state === "downloading" && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                      backgroundColor: colors.tint,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {state === "error" && (
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={() => {
              setError(null);
              setState("idle");
            }}
          >
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </Pressable>
        )}

        {state === "idle" && (
          <>
            {/* Display Mode Selector */}
            <View style={styles.modeSelector}>
              <ThemedText style={styles.modeLabel}>Display Mode:</ThemedText>
              <View style={styles.modeButtons}>
                <Pressable
                  style={[
                    styles.modeButton,
                    displayMode === "single" && { backgroundColor: colors.tint },
                  ]}
                  onPress={() => setDisplayMode("single")}
                >
                  <ThemedText
                    style={[
                      styles.modeButtonText,
                      displayMode === "single" && { color: "#fff" },
                    ]}
                  >
                    Single
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.modeButton,
                    displayMode === "slideshow" && { backgroundColor: colors.tint },
                  ]}
                  onPress={() => setDisplayMode("slideshow")}
                >
                  <ThemedText
                    style={[
                      styles.modeButtonText,
                      displayMode === "slideshow" && { color: "#fff" },
                    ]}
                  >
                    Slideshow
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedText style={styles.modeDescription}>
                {displayMode === "single"
                  ? "Shows one photo on the widget"
                  : "Rotates through all photos automatically"}
              </ThemedText>
            </View>

            <Pressable
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={startPicker}
            >
              <ThemedText style={styles.buttonText}>
                📷 Open Google Photos
              </ThemedText>
            </Pressable>
          </>
        )}

        <Pressable
          style={[styles.cancelButton, { borderColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={[styles.cancelButtonText, { color: colors.tint }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: "center",
  },
  title: {
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  loaderContainer: {
    marginVertical: 24,
    alignItems: "center",
    width: "100%",
  },
  progressContainer: {
    width: "80%",
    height: 8,
    backgroundColor: "rgba(128,128,128,0.3)",
    borderRadius: 4,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  modeSelector: {
    width: "100%",
    marginBottom: 24,
    alignItems: "center",
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.3)",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modeDescription: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
    minWidth: 200,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
