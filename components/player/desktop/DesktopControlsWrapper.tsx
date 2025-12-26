import React from 'react';
import { DesktopControls } from './DesktopControls';
import { useDesktopPlayerState } from '../hooks/useDesktopPlayerState';
import { useDesktopPlayerLogic } from '../hooks/useDesktopPlayerLogic';

interface DesktopControlsWrapperProps {
    src: string;
    state: ReturnType<typeof useDesktopPlayerState>['state'];
    logic: ReturnType<typeof useDesktopPlayerLogic>;
    refs: ReturnType<typeof useDesktopPlayerState>['refs'];
}

export function DesktopControlsWrapper({ src, state, logic, refs }: DesktopControlsWrapperProps) {
    const {
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isFullscreen,
        showControls,
        playbackRate,
        showSpeedMenu,
        showMoreMenu,
        showVolumeBar,
        isPiPSupported,
        isAirPlaySupported,
        isCastAvailable,
        setShowSpeedMenu,
        setShowMoreMenu,
    } = state;

    const {
        togglePlay,
        skipForward,
        skipBackward,
        toggleMute,
        handleVolumeChange,
        handleVolumeMouseDown,
        toggleFullscreen,
        togglePictureInPicture,
        showAirPlayMenu,
        showCastMenu,
        changePlaybackSpeed,
        handleCopyLink,
        handleProgressClick,
        handleProgressMouseDown,
        startSpeedMenuTimeout,
        clearSpeedMenuTimeout,
        formatTime,
    } = logic;

    const {
        progressBarRef,
        volumeBarRef,
        moreMenuTimeoutRef,
    } = refs;

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const isProxied = src.includes('/api/proxy');

    return (
        <DesktopControls
            showControls={showControls}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            playbackRate={playbackRate}
            showSpeedMenu={showSpeedMenu}
            showMoreMenu={showMoreMenu}
            showVolumeBar={showVolumeBar}
            isPiPSupported={isPiPSupported}
            isAirPlaySupported={isAirPlaySupported}
            isCastAvailable={isCastAvailable}
            isProxied={isProxied}
            progressBarRef={progressBarRef}
            volumeBarRef={volumeBarRef}
            onTogglePlay={togglePlay}
            onSkipForward={skipForward}
            onSkipBackward={skipBackward}
            onToggleMute={toggleMute}
            onVolumeChange={handleVolumeChange}
            onVolumeMouseDown={handleVolumeMouseDown}
            onToggleFullscreen={toggleFullscreen}
            onTogglePictureInPicture={togglePictureInPicture}
            onShowAirPlayMenu={showAirPlayMenu}
            onShowCastMenu={showCastMenu}
            onToggleSpeedMenu={() => setShowSpeedMenu(!showSpeedMenu)}
            onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
            onSpeedChange={changePlaybackSpeed}
            onCopyLink={handleCopyLink}
            onProgressClick={handleProgressClick}
            onProgressMouseDown={handleProgressMouseDown}
            onSpeedMenuMouseEnter={clearSpeedMenuTimeout}
            onSpeedMenuMouseLeave={startSpeedMenuTimeout}
            onMoreMenuMouseEnter={() => {
                if (moreMenuTimeoutRef.current) {
                    clearTimeout(moreMenuTimeoutRef.current);
                }
            }}
            onMoreMenuMouseLeave={() => {
                moreMenuTimeoutRef.current = setTimeout(() => {
                    setShowMoreMenu(false);
                }, 300);
            }}
            formatTime={formatTime}
            speeds={speeds}
        />
    );
}
