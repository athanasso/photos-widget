/**
 * TypeScript type declarations for the app
 */

// Environment types for app.json extra config
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
    }
  }
}

// Native module types
declare module "react-native" {
  interface NativeModulesStatic {
    SharedPreferencesModule?: {
      setWidgetData: (prefsName: string, data: string) => Promise<void>;
      getWidgetData: (prefsName: string) => Promise<string | null>;
      clearWidgetData: (prefsName: string) => Promise<void>;
    };
  }
}

export {};
