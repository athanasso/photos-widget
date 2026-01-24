/**
 * Expo Config Plugin for Android Widget
 * Adds necessary native configuration for the photo widget
 */

const {
  withAndroidManifest,
  withMainApplication,
} = require("@expo/config-plugins");

function withAndroidWidget(config) {
  // Add widget receiver to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];

    if (!mainApplication) {
      return config;
    }

    // Add receiver for widget
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    // Check if receiver already exists
    const hasReceiver = mainApplication.receiver.some(
      (r) => r.$?.["android:name"] === ".PhotoWidgetReceiver",
    );

    if (!hasReceiver) {
      mainApplication.receiver.push({
        $: {
          "android:name": ".PhotoWidgetReceiver",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/photo_widget_info",
            },
          },
        ],
      });
    }

    return config;
  });

  // Add widget task handler import to MainApplication
  config = withMainApplication(config, async (config) => {
    const mainApplication = config.modResults;

    // Add import for widget task handler if not present
    if (
      !mainApplication.contents.includes(
        "import com.reactnativeandroidwidget.RNWidgetPackage",
      )
    ) {
      // The react-native-android-widget package handles this automatically
    }

    return config;
  });

  return config;
}

module.exports = withAndroidWidget;
