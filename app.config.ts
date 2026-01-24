import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "photos-widget",
  slug: "photos-widget",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "photoswidget",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.athanasso.photoswidget",
  },
  android: {
    package: "com.athanasso.photoswidget",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-background-fetch",
      {
        startOnBoot: true,
      },
    ],
    [
      "react-native-android-widget",
      {
        widgets: [
          {
            name: "PhotoWidget",
            label: "Photo Widget",
            minWidth: "180dp",
            minHeight: "180dp",
            description: "Display your photos on your home screen",
            resizeMode: "horizontal|vertical",
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    "@react-native-google-signin/google-signin",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    router: {},
    eas: {
      projectId: "a6e75283-230e-4589-8c36-5933f421e3d7",
    },
  },
});
