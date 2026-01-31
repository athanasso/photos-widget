# 📷 Photos Widget

A beautiful Android home screen widget app that displays your photos from Google Photos or your local device.

![Platform](https://img.shields.io/badge/Platform-Android-green)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 📱 Photo Sources
- **Google Photos** - Select photos from your cloud library using the official Photos Picker API
- **Local Photos** - Choose photos directly from your device storage
- **Mix & Match** - Add photos from both sources to your widget

### 🖼️ Widget Display Modes
- **Single Mode** - Display one photo on your widget
- **Slideshow Mode** - Automatically rotate through multiple photos

### 🔄 Photo Rotation Options

| Method | Speed | Description |
|--------|-------|-------------|
| **Tap Widget** | Instant ⚡ | Tap the widget on your home screen to rotate |
| **Next Photo Button** | Instant ⚡ | Use the button in the app |
| **Reliable Rotation** | 5+ seconds | Foreground service with notification - **guaranteed timing!** |
| **Background Rotation** | 15-30+ min | No notification, but may be delayed by Android |

### ⚡ Reliable Rotation (NEW!)
- Uses a foreground service with a small notification
- Works at ANY interval - even 5 seconds!
- Bypasses Android's battery restrictions
- Perfect for digital photo frame use

### 🎛️ Photo Management
- View all selected photos in the dedicated Photos tab
- Delete individual photos or clear all
- See which photo is currently displayed
- Add more photos anytime

### ⚙️ Settings
- **Reliable Rotation** - Enable foreground service for guaranteed timing
- **Background Rotation** - Legacy mode using background fetch
- **Custom Intervals** - Set any interval from 5 seconds to hours
- **Clear all widget data** - Reset your widget

## 📲 Installation

### Prerequisites
- Node.js 18+
- Android Studio (for development builds)
- An Android device or emulator

### Setup

1. Clone the repository:
```bash
git clone https://github.com/athanasso/photos-widget.git
cd photos-widget
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

4. Build and run:
```bash
npx expo prebuild
npx expo run:android
```

## 🔧 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Photos Picker API**
4. Create OAuth 2.0 credentials:
   - **Web application** - For the auth session proxy
5. Add your credentials to the `.env` file


## 📁 Project Structure

```
photos-widget/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab screens
│   │   ├── index.tsx      # Home screen
│   │   ├── photos.tsx     # Photos management
│   │   └── settings.tsx   # Settings
│   └── photo-picker.tsx   # Google Photos picker
├── components/            # Reusable components
├── services/              # API and storage services
│   ├── google-auth.ts     # OAuth authentication
│   ├── photos-picker-api.ts # Google Photos Picker API
│   ├── widget-storage.ts  # Widget data management
│   ├── foreground-rotation.ts # Reliable rotation service
│   └── background-fetch.ts # Background rotation
├── widgets/               # Android widget components
│   └── photo-widget.tsx   # Widget rendering
└── android/              # Native Android code
    └── app/src/main/java/.../service/
        └── WidgetRotationService.kt # Foreground service
```

## 🛠️ Tech Stack

- **React Native** with **Expo** (SDK 54)
- **Expo Router** for navigation
- **react-native-android-widget** for Android widget support
- **expo-auth-session** for OAuth
- **expo-image-picker** for local photos
- **expo-file-system** for local storage
- **Native Foreground Service** for reliable rotation

## 📖 How It Works

1. **Authentication** - Sign in with Google to access your Photos library (optional for local photos)
2. **Photo Selection** - Choose photos from Google Photos or your device
3. **Photo Caching** - Selected photos are downloaded locally for offline access
4. **Widget Display** - Photos are rendered as a native Android widget
5. **Rotation Options**:
   - **Tap to rotate** - Tap the widget to see the next photo
   - **Reliable Rotation** - Foreground service guarantees precise timing
   - **Background Rotation** - System-managed, may be delayed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Developer

Created by [@athanasso](https://github.com/athanasso)

---

⭐ If you find this project useful, please give it a star!
