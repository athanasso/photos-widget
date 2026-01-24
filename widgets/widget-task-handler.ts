/**
 * Widget Task Handler Registration
 * Entry point for Android widget task handling
 */

import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from "react-native-android-widget";
import { PhotoWidgetComponent, widgetTaskHandler } from "./photo-widget";

// Register the widget task handler
registerWidgetTaskHandler(widgetTaskHandler);

// Register the widget configuration screen
registerWidgetConfigurationScreen(PhotoWidgetComponent);

