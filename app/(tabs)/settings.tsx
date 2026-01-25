/**
 * Settings Screen
 * App settings and configuration with interval selection
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
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
  showBackgroundSetupGuide,
  showIntervalWarning,
} from "@/services/battery-optimization";
import {
  isRotationServiceRunning,
  startRotationService,
  stopRotationService,
} from "@/services/foreground-rotation";
import {
  clearWidgetData,
  getWidgetData,
  requestWidgetUpdate,
  updateRotationInterval,
} from "@/services/widget-storage";
import * as BackgroundFetch from "expo-background-fetch";


// Preset intervals in seconds
// Note: Intervals shorter than 15 minutes may not work reliably due to Android battery optimization
const INTERVAL_PRESETS = [
  { label: "30 seconds ⚠️", value: 30 },
  { label: "1 minute ⚠️", value: 60 },
  { label: "5 minutes ⚠️", value: 300 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
];

export default function SettingsScreen() {
  const { isAuthenticated, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [backgroundFetchEnabled, setBackgroundFetchEnabled] = useState(false);
  const [backgroundFetchStatus, setBackgroundFetchStatus] =
    useState<string>("Unknown");
  const [photoCount, setPhotoCount] = useState(0);
  const [rotationInterval, setRotationInterval] = useState<number>(1800); // Default 30 min
  
  // Foreground service state
  const [foregroundServiceEnabled, setForegroundServiceEnabled] = useState(false);
  
  // Custom interval modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customIntervalInput, setCustomIntervalInput] = useState("");

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
        setRotationInterval(widgetData?.rotationIntervalSeconds ?? 1800);
        
        // Check foreground service status
        const isServiceRunning = await isRotationServiceRunning();
        setForegroundServiceEnabled(isServiceRunning);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleBackgroundFetchToggle = async (value: boolean) => {
    try {
      if (value) {
        await registerBackgroundFetch(rotationInterval);

        // Show warning/guide for short intervals
        if (rotationInterval < 900) {
          showIntervalWarning(rotationInterval);
        }
      } else {
        await unregisterBackgroundFetch();
      }
      setBackgroundFetchEnabled(value);
    } catch (error) {
      console.error("Error toggling background fetch:", error);
      Alert.alert("Error", "Failed to update background fetch setting");
    }
  };

  const handleForegroundServiceToggle = async (value: boolean) => {
    try {
      if (value) {
        await startRotationService(rotationInterval);
        Alert.alert(
          "Service Started",
          `Photos will rotate every ${formatInterval(rotationInterval)}. A notification will appear while the service is active.`
        );
      } else {
        await stopRotationService();
      }
      setForegroundServiceEnabled(value);
    } catch (error) {
      console.error("Error toggling foreground service:", error);
      Alert.alert("Error", "Failed to update foreground service");
    }
  };

  const handleIntervalChange = async (seconds: number) => {
    setRotationInterval(seconds);
    await updateRotationInterval(seconds);

    // Re-register background fetch with new interval if enabled
    if (backgroundFetchEnabled) {
      await registerBackgroundFetch(seconds);
    }
    
    // Restart foreground service with new interval if enabled
    if (foregroundServiceEnabled) {
      await stopRotationService();
      await startRotationService(seconds);
    }
  };

  const handleCustomInterval = () => {
    setCustomIntervalInput(rotationInterval.toString());
    setShowCustomModal(true);
  };

  const handleCustomIntervalSubmit = async () => {
    const seconds = parseInt(customIntervalInput || "30", 10);
    if (seconds >= 5) {
      await handleIntervalChange(seconds);
      setShowCustomModal(false);
      if (seconds < 900 && !foregroundServiceEnabled) {
        Alert.alert(
          "Enable Reliable Rotation",
          `For intervals under 15 min, enable "Reliable Rotation" in settings for guaranteed timing. Background rotation may be delayed by Android.`
        );
      }
    } else {
      Alert.alert("Invalid", "Interval must be at least 5 seconds");
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

  const formatInterval = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
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

          {/* Background Refresh Settings */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Photo Rotation
            </ThemedText>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  ⚡ Reliable Rotation (Recommended)
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Uses a foreground service with notification. Works at any interval, even 30 seconds!
                </ThemedText>
              </View>
              <Switch
                value={foregroundServiceEnabled}
                onValueChange={handleForegroundServiceToggle}
                trackColor={{ false: "#767577", true: colors.tint }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  Background Rotation (Unreliable)
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  No notification needed, but may be delayed or skipped by Android
                </ThemedText>
              </View>
              <Switch
                value={backgroundFetchEnabled}
                onValueChange={handleBackgroundFetchToggle}
                trackColor={{ false: "#767577", true: colors.tint }}
              />
            </View>

            {/* Rotation Interval Selection */}
            <View style={styles.intervalSection}>
              <ThemedText style={styles.settingLabel}>
                Rotation Interval: {formatInterval(rotationInterval)}
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                How often to switch photos
              </ThemedText>

              <View style={styles.intervalGrid}>
                {INTERVAL_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.value}
                    style={[
                      styles.intervalButton,
                      rotationInterval === preset.value && {
                        backgroundColor: colors.tint,
                      },
                    ]}
                    onPress={() => handleIntervalChange(preset.value)}
                  >
                    <ThemedText
                      style={[
                        styles.intervalButtonText,
                        rotationInterval === preset.value && {
                          color: "#fff",
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {preset.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.button, { borderColor: colors.tint, marginTop: 8 }]}
                onPress={handleCustomInterval}
              >
                <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                  ⚙️ Custom Interval
                </ThemedText>
              </Pressable>
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

            {/* Battery Optimization Guide Button */}
            <Pressable
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={showBackgroundSetupGuide}
            >
              <ThemedText style={[styles.buttonText, { color: "#fff" }]}>
                ⚡ Battery Optimization Guide
              </ThemedText>
            </Pressable>

            <ThemedText style={styles.infoText}>
              ⚡ Reliable Rotation: Shows a small notification but works at any interval (even 5 seconds). Perfect for short intervals.
            </ThemedText>
            <ThemedText style={styles.infoText}>
              🔋 Background Rotation: No notification, but Android limits it to ~15-30 min and may skip updates. Use Battery Optimization Guide to improve.
            </ThemedText>
            <ThemedText style={styles.infoText}>
              👆 Tip: You can also tap the widget on your home screen to instantly rotate photos!
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

      {/* Custom Interval Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ThemedText style={styles.modalTitle}>Custom Interval</ThemedText>
            <ThemedText style={styles.modalDescription}>
              Enter interval in seconds (min 5). Enable "Reliable Rotation" for short intervals.
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { 
                borderColor: colors.tint, 
                color: colorScheme === 'dark' ? '#fff' : '#000' 
              }]}
              value={customIntervalInput}
              onChangeText={setCustomIntervalInput}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCustomModal(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.tint }]}
                onPress={handleCustomIntervalSubmit}
              >
                <ThemedText style={styles.modalButtonSetText}>Set</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  intervalSection: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  intervalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    justifyContent: "space-between",
  },
  intervalButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    width: "48%",
    alignItems: "center",
  },
  intervalButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtonSetText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
