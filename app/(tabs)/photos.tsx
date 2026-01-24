/**
 * Photos Tab
 * Shows all selected photos for the widget with ability to add/delete
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    getWidgetData,
    requestWidgetUpdate,
    saveWidgetPhotos,
    type WidgetData,
    type WidgetPhoto,
} from "@/services/widget-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Alert,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3;

export default function PhotosScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);

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

  const handleAddFromGooglePhotos = () => {
    router.push("/photo-picker");
  };

  const handleAddLocalPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;

      const newPhotos: WidgetPhoto[] = [];
      
      for (const asset of result.assets) {
        try {
          const fileName = asset.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
          const localPath = `${FileSystem.cacheDirectory}widget-photos/${fileName}`;
          
          const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}widget-photos/`);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}widget-photos/`, { intermediates: true });
          }
          
          await FileSystem.copyAsync({ from: asset.uri, to: localPath });
          
          newPhotos.push({
            id: fileName,
            url: localPath,
            localPath: localPath,
            width: asset.width || 512,
            height: asset.height || 512,
          });
        } catch (err) {
          console.error("Error copying image:", err);
        }
      }

      if (newPhotos.length > 0) {
        const existingPhotos = widgetData?.photos || [];
        const allPhotos = [...existingPhotos, ...newPhotos];
        const displayMode = allPhotos.length > 1 ? "slideshow" : "single";
        
        await saveWidgetPhotos(allPhotos, displayMode);
        await requestWidgetUpdate();
        await loadWidgetData();
        
        Alert.alert("Success", `Added ${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''}!`);
      }
    } catch (error) {
      console.error("Error adding local photos:", error);
      Alert.alert("Error", "Failed to add photos");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert(
      "Delete Photo",
      "Remove this photo from the widget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const photos = widgetData?.photos.filter(p => p.id !== photoId) || [];
              const displayMode = photos.length > 1 ? "slideshow" : "single";
              await saveWidgetPhotos(photos, displayMode);
              await requestWidgetUpdate();
              await loadWidgetData();
            } catch (error) {
              console.error("Error deleting photo:", error);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Photos",
      "Remove all photos from the widget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await saveWidgetPhotos([], "single");
              await requestWidgetUpdate();
              await loadWidgetData();
            } catch (error) {
              console.error("Error clearing photos:", error);
            }
          },
        },
      ]
    );
  };

  const photos = widgetData?.photos || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Widget Photos</ThemedText>
          <ThemedText style={styles.subtitle}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} • {widgetData?.displayMode || 'single'} mode
          </ThemedText>
        </View>

        {/* Add Buttons */}
        <View style={styles.addButtons}>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={handleAddFromGooglePhotos}
          >
            <ThemedText style={styles.addButtonText}>📷 Google Photos</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={handleAddLocalPhotos}
          >
            <ThemedText style={styles.addButtonText}>🖼️ Local</ThemedText>
          </Pressable>
        </View>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>📷</ThemedText>
            <ThemedText style={styles.emptyText}>No photos selected</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Add photos using the buttons above
            </ThemedText>
          </View>
        ) : (
          <>
            <ScrollView style={styles.photosContainer} contentContainerStyle={styles.photosGrid}>
              {photos.map((photo, index) => (
                <Pressable
                  key={photo.id}
                  style={styles.photoItem}
                  onLongPress={() => handleDeletePhoto(photo.id)}
                >
                  <Image
                    source={{ uri: photo.url || photo.localPath }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                  {widgetData?.currentIndex === index && (
                    <View style={styles.currentBadge}>
                      <ThemedText style={styles.currentBadgeText}>Current</ThemedText>
                    </View>
                  )}
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeletePhoto(photo.id)}
                  >
                    <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>

            {/* Clear All Button */}
            <Pressable
              style={[styles.clearButton, { borderColor: "#ff3b30" }]}
              onPress={handleClearAll}
            >
              <ThemedText style={styles.clearButtonText}>🗑️ Clear All Photos</ThemedText>
            </Pressable>

            <ThemedText style={styles.tipText}>
              💡 Long press or tap ✕ to delete a photo
            </ThemedText>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.6,
  },
  addButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  addButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  photosContainer: {
    flex: 1,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  currentBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,122,255,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  deleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,59,48,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
  },
  clearButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 12,
  },
  clearButtonText: {
    color: "#ff3b30",
    fontWeight: "600",
  },
  tipText: {
    textAlign: "center",
    fontSize: 12,
    opacity: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
});
