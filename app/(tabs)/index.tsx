import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignInButton } from "@/components/sign-in-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserProfile } from "@/components/user-profile";
import { WidgetPreview } from "@/components/widget-preview";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isBackgroundFetchAvailable } from "@/services/background-fetch";
import { requestWidgetUpdate, saveWidgetPhotos } from "@/services/widget-storage";

export default function HomeScreen() {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    checkBackgroundFetch();
  }, []);

  const checkBackgroundFetch = async () => {
    if (Platform.OS === "android") {
      const available = await isBackgroundFetchAvailable();
      if (!available) {
        console.warn("Background fetch is not available on this device");
      }
    }
  };

  const handleSelectGooglePhotos = () => {
    router.push("/photo-picker");
  };

  const handleSelectLocalPhotos = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to select photos."
        );
        return;
      }

      // Pick multiple images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      // Copy images to app's cache directory
      const widgetPhotos = [];
      
      for (const asset of result.assets) {
        try {
          const fileName = asset.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
          const localPath = `${FileSystem.cacheDirectory}widget-photos/${fileName}`;
          
          // Ensure directory exists
          const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}widget-photos/`);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}widget-photos/`, { intermediates: true });
          }
          
          // Copy the image
          await FileSystem.copyAsync({
            from: asset.uri,
            to: localPath,
          });
          
          widgetPhotos.push({
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

      if (widgetPhotos.length > 0) {
        // Save photos with slideshow mode if multiple
        const displayMode = widgetPhotos.length > 1 ? "slideshow" : "single";
        await saveWidgetPhotos(widgetPhotos, displayMode);
        
        // Request widget update
        if (Platform.OS === "android") {
          requestWidgetUpdate();
        }

        Alert.alert(
          "Photos Added!",
          `${widgetPhotos.length} local photo${widgetPhotos.length > 1 ? "s" : ""} saved for your widget.`
        );
      }
    } catch (error) {
      console.error("Error selecting local photos:", error);
      Alert.alert("Error", "Failed to select photos");
    }
  };

  const showWidgetInstructions = () => {
    Alert.alert(
      "Add Widget to Home Screen",
      Platform.OS === "android"
        ? '1. Long press on your home screen\n2. Tap "Widgets"\n3. Find "Photo Widget"\n4. Drag it to your home screen'
        : "Widget support is only available on Android",
      [{ text: "Got it" }],
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title">Photos Widget</ThemedText>
            <ThemedText style={styles.subtitle}>
              Display your photos on your home screen
            </ThemedText>
          </View>

          {!isAuthenticated ? (
            /* Sign In Section - For Google Photos */
            <View style={styles.signInSection}>
              <ThemedText style={styles.signInPrompt}>
                Sign in with Google to access your Google Photos, or select photos from your device below
              </ThemedText>
              <SignInButton onPress={signIn} isLoading={isLoading} />
              
              {/* Local Photos option even when not signed in */}
              <ThemedText style={styles.orText}>— or —</ThemedText>
              
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.tint },
                ]}
                onPress={handleSelectLocalPhotos}
              >
                <ThemedText style={styles.actionButtonText}>
                  🖼️ Select Local Photos
                </ThemedText>
                <ThemedText style={styles.actionButtonSubtext}>
                  Choose photos from your device
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            /* Authenticated Section */
            <>
              {/* User Profile */}
              <UserProfile />

              {/* Widget Preview */}
              <WidgetPreview />

              {/* Actions */}
              <View style={styles.actionsSection}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Widget Options
                </ThemedText>

                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={handleSelectGooglePhotos}
                >
                  <ThemedText style={styles.actionButtonText}>
                    📷 Select from Google Photos
                  </ThemedText>
                  <ThemedText style={styles.actionButtonSubtext}>
                    Choose photos from your cloud library
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={handleSelectLocalPhotos}
                >
                  <ThemedText style={styles.actionButtonText}>
                    🖼️ Select Local Photos
                  </ThemedText>
                  <ThemedText style={styles.actionButtonSubtext}>
                    Choose photos from your device
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButtonOutline,
                    { borderColor: colors.tint },
                  ]}
                  onPress={showWidgetInstructions}
                >
                  <ThemedText
                    style={[
                      styles.actionButtonOutlineText,
                      { color: colors.tint },
                    ]}
                  >
                    ℹ️ How to Add Widget
                  </ThemedText>
                </Pressable>
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  How it Works
                </ThemedText>
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoNumber}>1</ThemedText>
                  <ThemedText style={styles.infoText}>
                    Select photos from Google Photos or your device
                  </ThemedText>
                </View>
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoNumber}>2</ThemedText>
                  <ThemedText style={styles.infoText}>
                    Add the Photo Widget to your Android home screen
                  </ThemedText>
                </View>
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoNumber}>3</ThemedText>
                  <ThemedText style={styles.infoText}>
                    Your photos will automatically update and rotate
                  </ThemedText>
                </View>
              </View>
            </>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 16,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: "center",
  },
  signInSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  signInPrompt: {
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 32,
    opacity: 0.8,
  },
  orText: {
    marginVertical: 24,
    opacity: 0.5,
  },
  actionsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionButtonSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  actionButtonOutline: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    marginTop: 8,
  },
  actionButtonOutlineText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,122,255,0.1)",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "700",
    marginRight: 12,
    color: "#007AFF",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});
