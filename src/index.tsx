import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo
} from "react";
import {
  useInterval,
  useStateCallback,
  roundToPlace,
  isWebVersion,
  cycleEl,
  mergeObject,
  range
} from "./util";
import { View, StyleSheet } from "react-native";
import WebView from "./WebView";

import type {
  Playlist,
  PlaybackRate,
  PlayerState,
  PlaylistTrack,
  PlaylistTrackActivity,
  PlaylistActivity,
  TrackPlayerProps,
  TrackPlayerRenderProps,
  TrackPlayerConfig,
  Activity
} from "./index.d";

export type {
  Playlist,
  PlaylistTrack,
  PlaylistTrackActivity,
  Activity,
  PlaylistActivity,
  TrackPlayerProps,
  TrackPlayerConfig,
  TrackPlayerRenderProps
};

const CONFIG_DEFAULTS: TrackPlayerConfig = {
  audioElementId: "rnwv_audio",
  playerIndexKey: "rnwv_player_index",
  webViewPostMessageIntervalMs: 1_000,
  activityIntervalMs: 20_000,
  finishedTrackPercentageThreshold: 90,
  trackTitleFallback: "Unknown Track",
  trackArtistFallback: "Unknown Artist"
};

const PLAYBACK_RATES: Array<PlaybackRate> = [1, 1.5, 2, 0.5];

const INITIAL_PLAYER_STATE: PlayerState = {
  playing: null,
  currentTime: null,
  duration: null,
  trackIndex: 0,
  playbackRate: 1
};

const makeElementId = (elemId: string) => (trackIndex: number) =>
  `${elemId}_${trackIndex}`;

const makePlayerHtml =
  (config: TrackPlayerConfig) =>
  (playlist: Playlist, startIndex: number = 0) =>
    `<head>
        <title>${
          playlist[startIndex]?.title ?? config.trackTitleFallback
        }</title>
      </head>
      ${playlist
        .map(
          (_, idx) =>
            `<audio 
               id="${makeElementId(config.audioElementId)(idx)}" 
               src="${playlist[idx]?.audio.url ?? ""}"
               preload="${idx === startIndex ? "auto" : "none"}" 
             />`
        )
        .join("\n")}
      <script>
        window.${config.playerIndexKey} = ${startIndex};
    
        if (window.ReactNativeWebView || window.parent) {
          setInterval(() => {
            const $audio = document.getElementById("${
              config.audioElementId
            }_" + window.${config.playerIndexKey});
            
            (window.ReactNativeWebView || window.parent).postMessage(
              JSON.stringify({
                playing: !$audio.paused && !isNaN($audio.duration),
                currentTime: parseInt($audio.currentTime),
                duration: parseInt($audio.duration),
                playbackRate: $audio.playbackRate
              })
            );
          }, ${config.webViewPostMessageIntervalMs});
        }
  
        if ("mediaSession" in window.navigator) {
          const $audio = document.getElementById("${
            config.audioElementId
          }_" + window.${config.playerIndexKey})
          $audio && $audio.play();
          window.navigator.mediaSession.metadata = new MediaMetadata({
            title: "${
              playlist[startIndex]?.title ?? config.trackTitleFallback
            }",
            artist: "${
              playlist[startIndex]?.artist || config.trackArtistFallback
            }"
          });
        }
      </script>`;

const TrackPlayer = ({
  playlist,
  activity,
  render,
  onActivity,
  config: configProp
}: TrackPlayerProps) => {
  const webviewRef: {
    current:
      | any /* FIXME: it's difficult to type this given the web/native lib split. 
                      see WebView.web/WebView.native for the individual types.  */
      | undefined;
  } = useRef();
  const [playerState, setPlayerState] = useState(INITIAL_PLAYER_STATE);
  const [activityState, setActivityState] = useState(activity || {});
  const [finishedLastTrack, setFinishedLastTrack] = useStateCallback(false);

  const config: TrackPlayerConfig = useMemo(
    () => mergeObject(CONFIG_DEFAULTS, configProp || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { trackIndex, playing, currentTime, duration, playbackRate } =
    playerState;
  const canSkipNext = trackIndex !== playlist.length - 1;
  const canSkipPrevious = trackIndex !== 0;
  const track = playlist[trackIndex];
  if (!track) {
    throw new Error(
      `Invariant violation: track at index ${trackIndex} is undefined.`
    );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const elementId = useCallback(makeElementId(config.audioElementId), [config]);

  const trackActivity = useMemo(
    () => activityState[track.id] || {},
    [activityState, track.id]
  ) as PlaylistTrackActivity;

  const playerHtml = useMemo(
    () => makePlayerHtml(config)(playlist),
    [config, playlist]
  );

  const getTrackMetadata = useCallback(
    (trackIdx: number) => ({
      title: playlist[trackIdx]?.title ?? config.trackTitleFallback,
      artist: playlist[trackIdx]?.artist ?? config.trackArtistFallback
    }),
    [config, playlist]
  );

  const setMediaSession = useCallback(
    (trackIdx: number) => {
      const { title, artist } = getTrackMetadata(trackIdx);

      if (webviewRef.current && webviewRef.current.injectJavaScript) {
        webviewRef.current.injectJavaScript(
          `if ("mediaSession" in window.navigator) {
             window.navigator.mediaSession.metadata = new MediaMetadata({
               title: "${title}",
               artist: "${artist}"
             });
           }`
        );
      } else if (webviewRef.current && webviewRef.current.contentDocument) {
        if (
          "mediaSession" in webviewRef.current.contentWindow.navigator &&
          webviewRef.current.contentWindow.MediaMetadata
        ) {
          webviewRef.current.contentWindow.navigator.mediaSession.metadata =
            new webviewRef.current.contentWindow.MediaMetadata({
              title,
              artist
            });
        }
      }
    },
    [getTrackMetadata]
  );

  const playPause = () => {
    if (webviewRef.current && webviewRef.current.injectJavaScript) {
      webviewRef.current.injectJavaScript(
        `document.getElementById("${elementId(trackIndex)}").${
          playing ? "pause" : "play"
        }();`
      );
    } else if (webviewRef.current && webviewRef.current.contentDocument) {
      const $audio = webviewRef.current.contentDocument.getElementById(
        elementId(trackIndex)
      );
      $audio ? (playing ? $audio.pause() : $audio.play()) : null;
    }

    onActivity?.({
      type: !playing ? "playedPlaylistTrack" : "pausedPlaylistTrack", // next state snapshot will set playing as true, so track as such
      payload: { trackId: track.id }
    });

    setMediaSession(trackIndex);
    setPlayerState({ ...playerState, playing: !playing });
  };

  const scrubTo = useCallback(
    (time: number, opts: { skipTracking?: boolean } = {}) => {
      if (webviewRef.current && webviewRef.current.injectJavaScript) {
        webviewRef.current.injectJavaScript(
          `document.getElementById("${elementId(
            trackIndex
          )}").currentTime = ${time};`
        );
        setPlayerState({ ...playerState, currentTime: time });
      } else if (webviewRef.current && webviewRef.current.contentDocument) {
        const $audio = webviewRef.current.contentDocument.getElementById(
          elementId(trackIndex)
        );
        $audio && ($audio.currentTime = time);
        setPlayerState({ ...playerState, currentTime: time });
      }

      if (!opts.skipTracking) {
        onActivity?.({
          type: "scrubbedPlaylistTrack",
          payload: { trackId: track.id, scrubbedToSecs: time }
        });
      }
    },
    [playerState, track, trackIndex, elementId, onActivity]
  );

  const handleNextPrev = useCallback(
    (currIndex: number, seekIndex: number) => {
      if (webviewRef.current && webviewRef.current.injectJavaScript) {
        webviewRef.current.injectJavaScript(
          `try {
               const $audio1 = document.getElementById("${elementId(
                 currIndex
               )}");
               const $audio2 = document.getElementById("${elementId(
                 seekIndex
               )}");
             
               $audio1.pause();
               $audio2.play();
               window.${config.playerIndexKey} = ${seekIndex};  
    
               if (window.ReactNativeWebView || window.parent) {
                (window.ReactNativeWebView || window.parent).postMessage(
                  JSON.stringify({
                    playing: !$audio2.paused,
                    currentTime: parseInt($audio2.currentTime),
                    duration: parseInt($audio2.duration),
                  }));
               }
             } catch (e) {}`
        );
      } else if (webviewRef.current && webviewRef.current.contentDocument) {
        const $audio1 = webviewRef.current.contentDocument.getElementById(
          elementId(currIndex)
        );
        const $audio2 = webviewRef.current.contentDocument.getElementById(
          elementId(seekIndex)
        );
        $audio1.pause();
        $audio2.play();
        webviewRef.current.contentWindow[config.playerIndexKey] = seekIndex;
      }

      setMediaSession(seekIndex);
    },
    [setMediaSession, config.playerIndexKey, elementId]
  );

  const handleActivityNextPrev = useCallback(
    (
      previous: {
        track: PlaylistTrack;
        activity: PlaylistTrackActivity | undefined;
      },
      next: {
        track: PlaylistTrack;
        activity: PlaylistTrackActivity | undefined;
        isAutoSkip?: boolean | undefined;
      }
    ) => {
      const { activity: prevActivity } = previous;
      const { track: nextTrack, isAutoSkip } = next;

      if (prevActivity) {
        if (
          prevActivity.percentageListened >=
          config.finishedTrackPercentageThreshold
        ) {
          onActivity?.({
            type: "finishedPlaylistTrack",
            payload: { ...prevActivity, secToListened: undefined }
          });

          scrubTo(0, { skipTracking: true }); // reset prev track position so that it can be replayed if wanted
          setActivityState({
            ...activityState,
            [track.id]: {
              ...prevActivity,
              secToListened: undefined,
              percentageListened: 0
            }
          });
        } else {
          // otherwise, track as playing or skipped
          if (!isAutoSkip) {
            onActivity?.({
              type: "skippedPlaylistTrack",
              payload: {
                ...prevActivity,
                nextTrackId: nextTrack.id,
                secToListened: undefined
              }
            });
          } else {
            onActivity?.({
              type: "playingPlaylistTrack",
              payload: { ...prevActivity, secToListened: undefined }
            });
          }
        }
      }

      onActivity?.({
        type: "playedPlaylistTrack",
        payload: { trackId: nextTrack.id }
      });
    },
    [
      activityState,
      scrubTo,
      track,
      config.finishedTrackPercentageThreshold,
      onActivity
    ]
  );

  const handleActivityInterval = useCallback(
    (event) => {
      if (playing && event.duration) {
        if (!trackActivity.secToListened) {
          trackActivity.secToListened = range(event.duration).reduce(
            (accum: { [sec: number]: boolean }, sec: number) => {
              accum[sec] = false;
              return accum;
            },
            {}
          );
        }

        const secToListened = {
          ...trackActivity.secToListened,
          ...range(
            Math.max(
              Math.round(
                event.currentTime -
                  config.webViewPostMessageIntervalMs / 1000 -
                  playbackRate
              ),
              0
            ),
            Math.round(
              event.currentTime +
                config.webViewPostMessageIntervalMs / 1000 +
                playbackRate
            )
          ).reduce((accum: { [sec: number]: boolean }, sec: number) => {
            accum[sec] = true;
            return accum;
          }, {})
        };
        const secToListenedArr = Object.values(secToListened);
        const newTrackActivity: PlaylistTrackActivity = {
          ...trackActivity,
          trackId: track.id,
          lastPositionSecs: event.currentTime,
          totalListenedSecs:
            (trackActivity.totalListenedSecs || 0) +
            config.webViewPostMessageIntervalMs / 1000,
          secToListened,
          percentageListened: Math.max(
            roundToPlace(
              (secToListenedArr.filter((sec) => !!sec).length /
                secToListenedArr.length) *
                100
            ),
            trackActivity.percentageListened || 0
          )
        };

        setActivityState({
          ...activityState,
          [track.id]: newTrackActivity
        });
      }
    },
    [
      activityState,
      playing,
      track,
      trackActivity,
      playbackRate,
      config.webViewPostMessageIntervalMs
    ]
  );

  const next = useCallback(
    ({ isAutoSkip }: { isAutoSkip?: boolean } = {}) => {
      if (canSkipNext) {
        handleActivityNextPrev(
          // @ts-ignore already guarded via canSkipNext
          { track: playlist[trackIndex], activity: trackActivity || {} },
          {
            track: playlist[trackIndex + 1],
            // @ts-ignore already guarded via canSkipNext
            activity: activityState[playlist[trackIndex + 1]?.id] || {},
            isAutoSkip
          }
        );
        handleNextPrev(trackIndex, trackIndex + 1);
        setPlayerState({
          ...playerState,
          ...INITIAL_PLAYER_STATE,
          trackIndex: trackIndex + 1
        });
      }
    },
    [
      playerState,
      trackIndex,
      canSkipNext,
      trackActivity,
      activityState,
      playlist,
      handleNextPrev,
      handleActivityNextPrev
    ]
  );

  const previous = () => {
    if (canSkipPrevious) {
      handleActivityNextPrev(
        // @ts-ignore already guarded via canSkipPrevious
        { track: playlist[trackIndex], activity: trackActivity || {} },
        {
          track: playlist[trackIndex - 1],
          // @ts-ignore already guarded via canSkipPrevious
          activity: activityState[playlist[trackIndex - 1].id] || {}
        }
      );
      handleNextPrev(trackIndex, trackIndex - 1);
      setPlayerState({
        ...playerState,
        ...INITIAL_PLAYER_STATE,
        trackIndex: trackIndex - 1
      });
    }
  };

  const seekTrack = useCallback(
    (seekIndex: number) => {
      if (canSkipNext || canSkipPrevious) {
        handleActivityNextPrev(
          // @ts-ignore already guarded
          { track: playlist[trackIndex], activity: trackActivity || {} },
          {
            track: playlist[seekIndex],
            // @ts-ignore already guarded
            activity: activityState[playlist[seekIndex].id] || {}
          }
        );
        handleNextPrev(trackIndex, seekIndex);
        setPlayerState({
          ...playerState,
          ...INITIAL_PLAYER_STATE,
          trackIndex: seekIndex
        });
      }
    },
    [
      playerState,
      activityState,
      trackIndex,
      canSkipNext,
      canSkipPrevious,
      playlist,
      trackActivity,
      handleNextPrev,
      handleActivityNextPrev
    ]
  );

  const setPlaybackRate = (skipToRate?: PlaybackRate) => {
    const nextPlaybackRate = cycleEl(
      PLAYBACK_RATES,
      typeof skipToRate !== "undefined" ? skipToRate : playbackRate
    );

    if (webviewRef.current && webviewRef.current.injectJavaScript) {
      webviewRef.current.injectJavaScript(
        `document.getElementById("${elementId(
          trackIndex
        )}").playbackRate = ${nextPlaybackRate};`
      );
    } else if (webviewRef.current && webviewRef.current.contentDocument) {
      const $audio = webviewRef.current.contentDocument.getElementById(
        elementId(trackIndex)
      );
      $audio && ($audio.playbackRate = nextPlaybackRate);
    }

    setPlayerState({ ...playerState, playbackRate: nextPlaybackRate });
  };

  // Set up listener for WebView postMessage on web
  useEffect(() => {
    if (isWebVersion()) {
      const handler = (event: MessageEvent) => {
        const eventData = JSON.parse(event.data);
        handleActivityInterval(eventData);
        setPlayerState({
          ...playerState,
          ...eventData
        });
      };

      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }

    return () => {};
  }, [playerState, handleActivityInterval]);

  // Automatically skip to next track when finished
  useEffect(() => {
    if (duration && duration === currentTime) {
      canSkipNext && next({ isAutoSkip: true });

      if (
        playlist.length - 1 === trackIndex &&
        trackActivity &&
        trackActivity.percentageListened >=
          config.finishedTrackPercentageThreshold &&
        !finishedLastTrack
      ) {
        setFinishedLastTrack(true, () => {
          onActivity?.({
            type: "finishedPlaylistTrack",
            payload: { ...trackActivity }
          });
          scrubTo(0, { skipTracking: true }); // reset track position so that it can be replayed if wanted
          setActivityState({
            ...activityState,
            [track.id]: {
              ...trackActivity,
              secToListened: undefined,
              percentageListened: 0
            }
          });
          setFinishedLastTrack(false);
        });
      }
    }
  }, [
    playlist,
    duration,
    currentTime,
    canSkipNext,
    trackIndex,
    activityState,
    finishedLastTrack,
    track,
    trackActivity,
    next,
    setFinishedLastTrack,
    scrubTo,
    onActivity,
    config.finishedTrackPercentageThreshold
  ]);

  // Send activity on an interval for activity
  const trackPlayingTrack = () => {
    if (playing && trackActivity && onActivity) {
      onActivity({
        type: "playingPlaylistTrack",
        payload: { ...trackActivity, secToListened: undefined }
      });
    }
  };

  useInterval(
    trackPlayingTrack,
    config.activityIntervalMs,
    trackPlayingTrack // on unmount, attempt to flush activity
  );

  return (
    <React.Fragment>
      <View style={styles.hidden}>
        <WebView
          ref={webviewRef}
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={["*"]}
          onMessage={(event) => {
            const eventData = JSON.parse(event.nativeEvent.data);
            handleActivityInterval(eventData);
            setPlayerState({
              ...playerState,
              ...eventData
            });
          }}
          style={styles.hidden}
          source={{ html: playerHtml }}
        />
      </View>
      {render({
        playerState,
        activityState,
        previous,
        next,
        seekTrack,
        playPause,
        scrubTo,
        setPlaybackRate
      })}
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  hidden: { display: "none" }
});

export default TrackPlayer;
