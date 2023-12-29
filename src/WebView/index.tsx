import { Platform } from "react-native";
import { WebView as WebViewWeb } from "./WebView.web";
import { WebView as WebViewNative } from "./WebView.native";

import type { ViewStyle } from "react-native";

export type WebViewProps = {
  source: { uri?: string; html?: string };
  containerStyle?: ViewStyle;
};

const WebView =
  Platform.OS === "web" ? WebViewWeb : WebViewNative<WebViewProps>;

export default WebView;
