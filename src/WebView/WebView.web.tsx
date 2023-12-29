import React from "react";
import { View, StyleSheet } from "react-native";

import type { WebViewProps } from "./index";

const WebView = React.forwardRef(
  ({ containerStyle, source }: WebViewProps, ref) => (
    <View style={containerStyle}>
      <iframe
        ref={ref as React.RefObject<HTMLIFrameElement>}
        src={source.uri}
        srcDoc={source.html}
        style={styles.frame}
      />
    </View>
  )
);

const styles = StyleSheet.create({
  frame: { border: 0, width: "100%", height: "100%" }
});

export { WebView };
