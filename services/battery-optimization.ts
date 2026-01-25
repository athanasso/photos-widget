/**
 * Battery Optimization Service
 * Helps users disable battery optimization for reliable background updates
 */

import { Alert, Linking, Platform } from "react-native";

/**
 * Check if we can request battery optimization exemption
 * Note: This requires native implementation for full functionality
 */
export async function checkBatteryOptimization(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  // This would require native module implementation
  // For now, we'll return false to prompt user guidance
  return false;
}

/**
 * Guide user to disable battery optimization
 */
export function promptDisableBatteryOptimization(appName: string = "Photos Widget"): void {
  if (Platform.OS !== "android") return;

  Alert.alert(
    "⚡ Disable Battery Optimization",
    `For reliable photo rotation, especially with short intervals (< 15 minutes), you should disable battery optimization for ${appName}.\n\n` +
    "This ensures Android doesn't restrict background updates.\n\n" +
    "Steps:\n" +
    "1. Tap 'Open Settings' below\n" +
    "2. Find 'Battery' or 'Battery optimization'\n" +
    "3. Tap 'All apps' or the dropdown\n" +
    `4. Find '${appName}'\n` +
    "5. Select 'Don't optimize' or 'Unrestricted'",
    [
      {
        text: "Later",
        style: "cancel",
      },
      {
        text: "Open Settings",
        onPress: () => {
          // Open app settings
          Linking.openSettings();
        },
      },
    ]
  );
}

/**
 * Show comprehensive setup guide for reliable background updates
 */
export function showBackgroundSetupGuide(): void {
  if (Platform.OS !== "android") return;

  Alert.alert(
    "📱 Background Update Setup",
    "For the most reliable photo rotation, especially with short intervals:\n\n" +
    "✓ Disable Battery Optimization:\n" +
    "  Settings → Battery → Battery optimization → Photos Widget → Don't optimize\n\n" +
    "✓ Allow Background Activity:\n" +
    "  Settings → Apps → Photos Widget → Battery → Allow background activity\n\n" +
    "✓ Disable Adaptive Battery (optional):\n" +
    "  Settings → Battery → Adaptive Battery → Off\n\n" +
    "✓ Remove from Recent Apps Cleaner:\n" +
    "  Don't swipe away the app from recent apps\n\n" +
    "Note: Some manufacturers (Samsung, Xiaomi, Huawei, OnePlus) have aggressive battery management. You may need to check manufacturer-specific settings.",
    [
      {
        text: "Got it",
        style: "default",
      },
      {
        text: "Open Settings",
        onPress: () => {
          Linking.openSettings();
        },
      },
    ]
  );
}

/**
 * Show interval-specific warning
 */
export function showIntervalWarning(intervalSeconds: number): void {
  if (Platform.OS !== "android") return;

  if (intervalSeconds < 300) { // Less than 5 minutes
    Alert.alert(
      "⚠️ Very Short Interval",
      `You've selected a ${intervalSeconds} second interval. This is very aggressive and may:\n\n` +
      "• Drain battery significantly\n" +
      "• Be delayed by Android's Doze mode\n" +
      "• Require disabling battery optimization\n\n" +
      "For best results:\n" +
      "1. Disable battery optimization\n" +
      "2. Keep the app open in background\n" +
      "3. Consider using 30-60 seconds minimum\n\n" +
      "Would you like to see the setup guide?",
      [
        {
          text: "No, Continue",
          style: "cancel",
        },
        {
          text: "Show Guide",
          onPress: showBackgroundSetupGuide,
        },
      ]
    );
  } else if (intervalSeconds < 900) { // Less than 15 minutes
    Alert.alert(
      "💡 Short Interval Tip",
      `You've selected a ${Math.floor(intervalSeconds / 60)} minute interval.\n\n` +
      "For intervals under 15 minutes, disabling battery optimization is recommended for reliability.\n\n" +
      "Would you like to see the setup guide?",
      [
        {
          text: "No Thanks",
          style: "cancel",
        },
        {
          text: "Show Guide",
          onPress: showBackgroundSetupGuide,
        },
      ]
    );
  }
}

/**
 * Manufacturer-specific battery optimization guides
 */
export const MANUFACTURER_GUIDES = {
  samsung: {
    name: "Samsung",
    steps: [
      "Settings → Apps → Photos Widget",
      "Battery → Allow background activity",
      "Go back → Settings → Device care → Battery",
      "App power management → Apps that won't be put to sleep → Add Photos Widget",
    ],
  },
  xiaomi: {
    name: "Xiaomi/MIUI",
    steps: [
      "Settings → Apps → Manage apps → Photos Widget",
      "Battery saver → No restrictions",
      "Autostart → Enable",
      "Settings → Battery & performance → Battery → App battery saver → Off",
    ],
  },
  huawei: {
    name: "Huawei/Honor",
    steps: [
      "Settings → Apps → Apps → Photos Widget",
      "Battery → Launch: Manage manually → Enable all three toggles",
      "Settings → Battery → App launch → Manually manage → Enable all",
    ],
  },
  oneplus: {
    name: "OnePlus",
    steps: [
      "Settings → Apps → Photos Widget",
      "Battery → Battery optimization → Don't optimize",
      "Advanced → Background restrictions → Don't restrict",
    ],
  },
  oppo: {
    name: "Oppo/Realme",
    steps: [
      "Settings → Battery → Battery optimization → Photos Widget → Don't optimize",
      "Settings → Apps → Photos Widget → Battery → Background freeze → Off",
    ],
  },
};
