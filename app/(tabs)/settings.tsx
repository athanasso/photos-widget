/**
 * Settings Screen
 * App settings and configuration
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getBackgroundFetchStatus,
  isTaskRegistered,
  registerBackgroundFetch,
  unregisterBackgroundFetch,
} from "@/services/background-fetch";
import {
  clearWidgetData,
  getWidgetData,
  requestWidgetUpdate,
} from "@/services/widget-storage";
import * as BackgroundFetch from "expo-background-fetch";

export default function SettingsScreen() {
  const { isAuthenticated, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [backgroundFetchEnabled, setBackgroundFetchEnabled] = useState(false);
  const [backgroundFetchStatus, setBackgroundFetchStatus] =
    useState<string>("Unknown");
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Check background fetch status
      const isRegistered = await isTaskRegistered();
      setBackgroundFetchEnabled(isRegistered);

      const status = await getBackgroundFetchStatus();
      switch (status) {
        case BackgroundFetch.BackgroundFetchStatus.Available:
          setBackgroundFetchStatus("Available");
          break;
        case BackgroundFetch.BackgroundFetchStatus.Denied:
          setBackgroundFetchStatus("Denied");
          break;
        case BackgroundFetch.BackgroundFetchStatus.Restricted:
          setBackgroundFetchStatus("Restricted");
          break;
        default:
          setBackgroundFetchStatus("Unknown");
      }

      // Get current widget data
      if (Platform.OS === "android") {
        const widgetData = await getWidgetData();
        setPhotoCount(widgetData?.photos?.length ?? 0);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleBackgroundFetchToggle = async (value: boolean) => {
    try {
      if (value) {
        await registerBackgroundFetch();
      } else {
        await unregisterBackgroundFetch();
      }
      setBackgroundFetchEnabled(value);
    } catch (error) {
      console.error("Error toggling background fetch:", error);
      Alert.alert("Error", "Failed to update background fetch setting");
    }
  };

  const handleClearWidgetData = async () => {
    Alert.alert(
      "Clear Widget Data",
      "This will remove all photos from the widget. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearWidgetData();
              if (Platform.OS === "android") {
                requestWidgetUpdate();
              }
              setPhotoCount(0);
              Alert.alert("Success", "Widget data cleared");
            } catch (error) {
              console.error("Error clearing widget data:", error);
              Alert.alert("Error", "Failed to clear widget data");
            }
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Widget data will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: signOut,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          {/* Widget Settings */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Widget
            </ThemedText>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  Photos in Widget
                </ThemedText>
                <ThemedText style={styles.settingValue}>
                  {photoCount} photo(s)
                </ThemedText>
              </View>
            </View>

            <Pressable
              style={[styles.button, { borderColor: colors.tint }]}
              onPress={handleClearWidgetData}
              disabled={photoCount === 0}
            >
              <ThemedText
                style={[
                  styles.buttonText,
                  photoCount === 0 && styles.buttonTextDisabled,
                ]}
              >
                Clear Widget Photos
              </ThemedText>
            </Pressable>
          </View>

          {/* Background Fetch Settings */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Background Refresh
            </ThemedText>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  Auto-rotate Photos
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  When enabled, the widget will automatically cycle through your photos in slideshow mode. Runs approximately every 30 minutes (controlled by Android).
                </ThemedText>
              </View>
              <Switch
                value={backgroundFetchEnabled}
                onValueChange={handleBackgroundFetchToggle}
                trackColor={{ false: "#767577", true: colors.tint }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  Background Fetch Status
                </ThemedText>
                <ThemedText style={styles.settingValue}>
                  {backgroundFetchStatus}
                </ThemedText>
                {backgroundFetchStatus === "Denied" && (
                  <ThemedText style={styles.warningText}>
                    Background refresh is disabled. Check your device settings.
                  </ThemedText>
                )}
              </View>
            </View>

            <ThemedText style={styles.infoText}>
              💡 Tip: Use the "Next Photo" button on the Home screen to manually rotate photos, or tap the widget on your home screen.
            </ThemedText>
          </View>

          {/* Account Settings */}
          {isAuthenticated && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Account
              </ThemedText>

              <Pressable style={[styles.dangerButton]} onPress={handleSignOut}>
                <ThemedText style={styles.dangerButtonText}>
                  Sign Out
                </ThemedText>
              </Pressable>
            </View>
          )}


          {/* About Section */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              About
            </ThemedText>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Version</ThemedText>
                <ThemedText style={styles.settingValue}>1.0.0</ThemedText>
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Developer</ThemedText>
                <ThemedText style={styles.settingValue}>@athanasso</ThemedText>
              </View>
            </View>

            <Pressable
              style={[styles.button, { borderColor: colors.tint }]}
              onPress={() => {
                import("react-native").then(({ Linking }) => {
                  Linking.openURL("https://github.com/athanasso/photos-widget");
                });
              }}
            >
              <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                🔗 View on GitHub
              </ThemedText>
            </Pressable>
          </View>
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
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    opacity: 0.8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  settingValue: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  buttonTextDisabled: {
    opacity: 0.4,
  },
  dangerButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    alignItems: "center",
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff3b30",
  },
  warningText: {
    fontSize: 12,
    color: "#ff9500",
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 12,
    lineHeight: 18,
  },
});
