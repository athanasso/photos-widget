/**
 * Widget Preview Component
 * Shows current widget configuration and preview with manual rotation
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getWidgetData,
  requestWidgetUpdate,
  rotateToNextPhoto,
  type WidgetData
} from "@/services/widget-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

export function WidgetPreview() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);

  // Reload widget data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWidgetData();
    }, [])
  );

  const loadWidgetData = async () => {
    if (Platform.OS !== "android") return;

    try {
      const data = await getWidgetData();
      setWidgetData(data);
    } catch (error) {
      console.error("Failed to load widget data:", error);
    }
  };

  const handleNextPhoto = async () => {
    if (!widgetData || widgetData.photos.length <= 1) {
      return;
    }

    try {
      await rotateToNextPhoto();
      // Update the home screen widget
      await requestWidgetUpdate();
      await loadWidgetData();
    } catch (error) {
      console.error("Failed to rotate photo:", error);
    }
  };

  if (Platform.OS !== "android") {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Widget Preview</ThemedText>
        <ThemedText style={styles.subtitle}>Android only feature</ThemedText>
      </ThemedView>
    );
  }

  const currentPhoto = widgetData?.photos?.[widgetData.currentIndex];

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Widget Preview</ThemedText>

      <View style={styles.previewContainer}>
        {currentPhoto ? (
          <Image
            source={{ uri: currentPhoto.url || currentPhoto.localPath }}
            style={styles.previewImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.emptyPreview, { backgroundColor: colors.icon }]}>
            <ThemedText style={styles.emptyIcon}>📷</ThemedText>
            <ThemedText style={styles.emptyText}>No photo selected</ThemedText>
          </View>
        )}
      </View>

      {widgetData && (
        <View style={styles.infoContainer}>
          <ThemedText style={styles.infoText}>
            {widgetData.photos.length} photo(s) • {widgetData.displayMode} mode
          </ThemedText>
          {widgetData.displayMode === "slideshow" && widgetData.photos.length > 1 && (
            <>
              <ThemedText style={styles.infoSubtext}>
                Showing {widgetData.currentIndex + 1} of {widgetData.photos.length}
              </ThemedText>
              <Pressable
                style={[styles.nextButton, { backgroundColor: colors.tint }]}
                onPress={handleNextPhoto}
              >
                <ThemedText style={styles.nextButtonText}>
                  ▶ Next Photo
                </ThemedText>
              </Pressable>
              <ThemedText style={styles.tipText}>
                💡 Tap "Next Photo" above to rotate in app
              </ThemedText>
              <ThemedText style={styles.tipText}>
                ⏱️ Widget auto-rotates every ~30 min
              </ThemedText>
            </>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  previewContainer: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreview: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.3,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  infoContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
  },
  infoSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  nextButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tipText: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 8,
    textAlign: "center",
  },
});

export default WidgetPreview;
