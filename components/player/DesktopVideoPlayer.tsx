'use client';

import React from 'react';
import { useDesktopPlayerState } from './hooks/useDesktopPlayerState';
import { useDesktopPlayerLogic } from './hooks/useDesktopPlayerLogic';
import { useHlsPlayer } from './hooks/useHlsPlayer';
import { useAutoSkip } from './hooks/useAutoSkip';
import { DesktopControlsWrapper } from './desktop/DesktopControlsWrapper';
import { DesktopOverlayWrapper } from './desktop/DesktopOverlayWrapper';

interface DesktopVideoPlayerProps {
  src: string;
  poster?: string;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  shouldAutoPlay?: boolean;
  // Episode navigation props for auto-skip/auto-next
  totalEpisodes?: number;
  currentEpisodeIndex?: number;
  onNextEpisode?: () => void;
}

export function DesktopVideoPlayer({
  src,
  poster,
  onError,
  onTimeUpdate,
  initialTime = 0,
  shouldAutoPlay = false,
  totalEpisodes = 1,
  currentEpisodeIndex = 0,
  onNextEpisode,
}: DesktopVideoPlayerProps) {
  const { refs, state } = useDesktopPlayerState();

  // Initialize HLS Player
  useHlsPlayer({
    videoRef: refs.videoRef,
    src,
    autoPlay: shouldAutoPlay
  });

  const {
    videoRef,
    containerRef,
  } = refs;

  const {
    isPlaying,
    currentTime,
    duration,
    setShowControls,
    setIsLoading,
  } = state;

  // Reset loading state and show spinner when source changes
  React.useEffect(() => {
    setIsLoading(true);
  }, [src, setIsLoading]);

  const logic = useDesktopPlayerLogic({
    src,
    initialTime,
    shouldAutoPlay,
    onError,
    onTimeUpdate,
    refs,
    state
  });

  // Auto-skip intro/outro and auto-next episode
  useAutoSkip({
    videoRef,
    currentTime,
    duration,
    isPlaying,
    totalEpisodes,
    currentEpisodeIndex,
    onNextEpisode,
  });

  const {
    handleMouseMove,
    togglePlay,
    handlePlay,
    handlePause,
    handleTimeUpdateEvent,
    handleLoadedMetadata,
    handleVideoError,
  } = logic;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-[var(--radius-2xl)] overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        x-webkit-airplay="allow"
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdateEvent}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onClick={togglePlay}
      />

      <DesktopOverlayWrapper
        state={state}
        showControls={state.showControls}
        onTogglePlay={togglePlay}
        onSkipForward={logic.skipForward}
        onSkipBackward={logic.skipBackward}
        // More Menu Props
        showMoreMenu={state.showMoreMenu}
        isProxied={src.includes('/api/proxy')}
        onToggleMoreMenu={() => state.setShowMoreMenu(!state.showMoreMenu)}
        onMoreMenuMouseEnter={() => {
          if (refs.moreMenuTimeoutRef.current) {
            clearTimeout(refs.moreMenuTimeoutRef.current);
            refs.moreMenuTimeoutRef.current = null;
          }
        }}
        onMoreMenuMouseLeave={() => {
          if (refs.moreMenuTimeoutRef.current) {
            clearTimeout(refs.moreMenuTimeoutRef.current);
          }
          refs.moreMenuTimeoutRef.current = setTimeout(() => {
            state.setShowMoreMenu(false);
            refs.moreMenuTimeoutRef.current = null;
          }, 800); // Increased timeout for better stability
        }}
        onCopyLink={logic.handleCopyLink}
        // Speed Menu Props
        playbackRate={state.playbackRate}
        showSpeedMenu={state.showSpeedMenu}
        speeds={[0.5, 0.75, 1, 1.25, 1.5, 2]}
        onToggleSpeedMenu={() => state.setShowSpeedMenu(!state.showSpeedMenu)}
        onSpeedChange={logic.changePlaybackSpeed}
        onSpeedMenuMouseEnter={logic.clearSpeedMenuTimeout}
        onSpeedMenuMouseLeave={logic.startSpeedMenuTimeout}
      />

      <DesktopControlsWrapper
        src={src}
        state={state}
        logic={logic}
        refs={refs}
      />
    </div>
  );
}
