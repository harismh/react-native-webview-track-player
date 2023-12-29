import React from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  SafeAreaView,
  Dimensions
} from "react-native";
import Slider from "@react-native-community/slider";
import { FontAwesome5 } from "@expo/vector-icons";
import { toTimeString, PrettyObject } from "./util";

import TrackPlayer, {
  type Playlist,
  type PlaylistTrack,
  type TrackPlayerRenderProps
} from "react-native-webview-track-player";

const maxWidth = Math.min(Dimensions.get("screen").width, 400);

const primaryColor = "#0ea5e9";

const playlist: Playlist = [
  {
    id: "e8DPlI",
    title: "Modern",
    artist: "JM Galiè",
    audio: {
      url: "https://raw.githubusercontent.com/harismh/react-native-webview-track-player/main/.github/audio/sample.mp3"
    }
  }
];

const Example = () => (
  <View style={styles.container}>
    <SafeAreaView style={styles.container}>
      <ScrollView style={[styles.column]} contentContainerStyle={styles.center}>
        <View style={styles.mv15}>
          <Text style={styles.textHeader}>RNWV Track Player</Text>
        </View>
        <TrackPlayer
          playlist={playlist}
          onActivity={console.log}
          render={({
            playerState,
            activityState,
            playPause,
            next,
            previous,
            scrubTo,
            setPlaybackRate
          }: TrackPlayerRenderProps) => {
            const { trackIndex, playing, currentTime, duration, playbackRate } =
              playerState;
            const canSkipNext = trackIndex !== playlist.length - 1;
            const canSkipPrevious = trackIndex !== 0;
            const track = playlist[trackIndex] as PlaylistTrack;

            return (
              <View>
                <View style={styles.tile}>
                  <View style={[styles.center, styles.albumTile]}>
                    <FontAwesome5 name="music" style={styles.albumTileIcon} />
                  </View>

                  {/* Title */}

                  <View style={styles.center}>
                    <Text style={styles.textTitle}>{track.title}</Text>
                    <Text style={[styles.textSubtitle, styles.pb8]}>
                      {track.artist}
                    </Text>
                  </View>

                  {/* Slider */}

                  <View style={styles.sliderContainer}>
                    <Slider
                      minimumValue={0}
                      maximumValue={duration || 0}
                      value={currentTime || 0}
                      onSlidingComplete={(time) => scrubTo(Math.round(time))}
                      minimumTrackTintColor="#0ea5e9"
                      disabled={duration === null || currentTime === null}
                      // @ts-expect-error
                      thumbStyle={
                        Platform.OS === "web" // iOS & Android don't support this prop
                          ? styles.sliderThumbWeb
                          : undefined
                      }
                    />
                    <View style={[styles.rowStretch, styles.pv8]}>
                      <Text style={styles.textSubtitle}>
                        {currentTime ? toTimeString(currentTime) : "--:--"}
                      </Text>
                      <Text style={styles.textSubtitle}>
                        {duration
                          ? "-" + toTimeString(duration - (currentTime || 0))
                          : "--:--"}
                      </Text>
                    </View>
                  </View>

                  {/* Controls */}

                  <View style={[styles.center, styles.rowStretch]}>
                    <View style={styles.controlsSpacerLg} />
                    <Pressable
                      style={styles.controlsSpacerSm}
                      onPress={() => previous()}
                      disabled={!canSkipPrevious}
                    >
                      <FontAwesome5
                        name={"backward"}
                        solid
                        size={24}
                        color="#222"
                        style={!canSkipPrevious ? styles.o50 : undefined}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.controlsSpacerSm}
                      onPress={() => playPause()}
                    >
                      <FontAwesome5
                        name={playing ? "pause-circle" : "play-circle"}
                        solid
                        size={44}
                        color={primaryColor}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.controlsSpacerSm}
                      onPress={() => next()}
                      disabled={!canSkipNext}
                    >
                      <FontAwesome5
                        name={"forward"}
                        solid
                        size={24}
                        color="#222"
                        style={!canSkipNext ? styles.o50 : undefined}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.controlsSpacerSm,
                        styles.controlsPlaybackContainer
                      ]}
                      onPress={() => setPlaybackRate()}
                      disabled={!playing}
                    >
                      <Text
                        style={[
                          styles.controlsPlayback,
                          !playing ? styles.controlsPlaybackDisabled : undefined
                        ]}
                      >
                        &times;{playbackRate.toFixed(1)}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Debug */}

                <View style={[styles.tile, styles.mv15, styles.debugTile]}>
                  <View>
                    <Text style={[styles.textTitle, styles.pb8]}>
                      Player State
                    </Text>
                    <PrettyObject o={playerState} />
                  </View>
                  <View>
                    <Text style={[styles.textTitle, styles.pb8]}>
                      Activity State
                    </Text>
                    <PrettyObject
                      o={activityState[track.id] || {}}
                      truncateKeys={["secToListened"]}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      </ScrollView>
    </SafeAreaView>
  </View>
);

export default class App extends React.Component {
  state: { error: Error | null; errorInfo: React.ErrorInfo | null } = {
    error: null,
    errorInfo: null
  };

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    const { error } = this.state;

    return error ? (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.errorContainer,
          styles.center
        ]}
      >
        <Text style={styles.errorTextLg}>Uncaught Error</Text>
        <Text style={styles.errorTextLg}>{error.message}</Text>
      </View>
    ) : (
      <Example />
    );
  }
}

const styles = StyleSheet.create({
  mv15: { marginVertical: 15 },
  mv30: { marginVertical: 30 },
  pv8: { paddingVertical: 8 },
  pb8: { paddingBottom: 8 },
  o50: { opacity: 0.5 },
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff"
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#fef2f2"
  },
  errorTextLg: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#BF443E"
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  },
  column: {
    flex: 1,
    flexDirection: "column"
  },
  rowStretch: {
    flexDirection: "row",
    alignContent: "stretch",
    justifyContent: "space-between"
  },
  textTitle: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#222"
  },
  textSubtitle: {
    fontSize: 14,
    color: "#9ca3af"
  },
  textHeader: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#222"
  },
  tile: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: 450,
    width: maxWidth * 0.9,
    borderRadius: 32,
    backgroundColor: "#fff",
    shadowColor: "#172554",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 1, height: 3 },
    elevation: 2
  },
  albumTile: {
    marginBottom: 40,
    height: 150,
    width: 150,
    borderRadius: 32,
    backgroundColor: "#e0f2fe"
  },
  albumTileIcon: {
    color: "#0ea5e9",
    fontSize: 70,
    transform: [{ scaleY: 1.2 }]
  },
  sliderContainer: {
    width: maxWidth * 0.75
  },
  sliderThumbWeb: {
    backgroundColor: "#fff",
    borderRadius: 20,
    boxShadow: `0 2px 5px rgba(0, 0, 0, 0.2)`
  },
  controlsSpacerLg: {
    position: "relative",
    marginRight: 95,
    bottom: 2
  },
  controlsSpacerSm: {
    position: "relative",
    marginRight: 30,
    bottom: 2
  },
  controlsPlaybackContainer: {
    width: 34
  },
  controlsPlayback: {
    fontSize: 16,
    color: primaryColor
  },
  controlsPlaybackDisabled: {
    color: "#222",
    opacity: 0.5
  },
  debugTile: {
    height: maxWidth * 0.8,
    alignItems: "flex-start",
    paddingHorizontal: 50,
    gap: 20
  }
});
