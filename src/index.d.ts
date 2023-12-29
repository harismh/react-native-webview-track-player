export type AudioMetadata = {
  url: string;
};

export type PlaylistTrack = {
  id: string;
  title: string;
  artist: string | undefined;
  audio: AudioMetadata;
};

export type Playlist = Array<PlaylistTrack>;

export type PlaylistTrackActivity = {
  trackId: string;
  lastPositionSecs: number;
  totalListenedSecs: number;
  percentageListened: number;
  secToListened?: { [sec: number]: boolean };
};

export type PlaylistActivity = {
  [id: string]: PlaylistTrackActivity;
};

export type PlaybackRate = 1 | 1.5 | 2 | 0.5;

export type PlayerState = {
  playing: boolean | null;
  currentTime: number | null;
  duration: number | null;
  trackIndex: number;
  playbackRate: PlaybackRate;
};

export type TrackPlayerConfig = {
  audioElementId: string;
  playerIndexKey: string;
  webViewPostMessageIntervalMs: number;
  activityIntervalMs: number;
  finishedTrackPercentageThreshold: number;
  trackTitleFallback: string;
  trackArtistFallback: string;
};

export type Activity =
  | {
      type: "playedPlaylistTrack";
      payload: { trackId: string };
    }
  | { type: "pausedPlaylistTrack"; payload: { trackId: string } }
  | {
      type: "finishedPlaylistTrack";
      payload: PlaylistTrackActivity;
    }
  | {
      type: "scrubbedPlaylistTrack";
      payload: { trackId: string; scrubbedToSecs: number };
    }
  | {
      type: "skippedPlaylistTrack";
      payload: PlaylistTrackActivity & { nextTrackId: string };
    }
  | {
      type: "playingPlaylistTrack";
      payload: PlaylistTrackActivity;
    };

export type TrackPlayerRenderProps = {
  playerState: PlayerState;
  activityState: PlaylistActivity;
  playPause: () => void;
  next: (opts?: { isAutoSkip?: boolean }) => void;
  previous: () => void;
  seekTrack: (seekIndex: number) => void;
  scrubTo: (time: number) => void;
  setPlaybackRate: (skipToRate?: PlaybackRate) => void;
};

export type TrackPlayerProps = {
  playlist: Playlist;
  activity?: PlaylistActivity | undefined;
  onActivity?: (activity: Activity) => void;
  config?: Partial<TrackPlayerConfig>;
  render: (props: TrackPlayerRenderProps) => React.ReactNode;
};
