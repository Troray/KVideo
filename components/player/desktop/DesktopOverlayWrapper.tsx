import React from 'react';
import { DesktopOverlay } from './DesktopOverlay';
import { useDesktopPlayerState } from '../hooks/useDesktopPlayerState';

interface DesktopOverlayWrapperProps {
    state: ReturnType<typeof useDesktopPlayerState>['state'];
    showControls: boolean;
    onTogglePlay: () => void;
    onSkipForward: () => void;
    onSkipBackward: () => void;
    showMoreMenu: boolean;
    isProxied: boolean;
    onToggleMoreMenu: () => void;
    onMoreMenuMouseEnter: () => void;
    onMoreMenuMouseLeave: () => void;
    onCopyLink: (type?: 'original' | 'proxy') => void;
    // Speed Menu Props
    playbackRate: number;
    showSpeedMenu: boolean;
    speeds: number[];
    onToggleSpeedMenu: () => void;
    onSpeedChange: (speed: number) => void;
    onSpeedMenuMouseEnter: () => void;
    onSpeedMenuMouseLeave: () => void;
}

export function DesktopOverlayWrapper({
    state,
    showControls,
    onTogglePlay,
    onSkipForward,
    onSkipBackward,
    showMoreMenu,
    isProxied,
    onToggleMoreMenu,
    onMoreMenuMouseEnter,
    onMoreMenuMouseLeave,
    onCopyLink,
    playbackRate,
    showSpeedMenu,
    speeds,
    onToggleSpeedMenu,
    onSpeedChange,
    onSpeedMenuMouseEnter,
    onSpeedMenuMouseLeave
}: DesktopOverlayWrapperProps) {
    const {
        isLoading,
        isPlaying,
        showSkipForwardIndicator,
        showSkipBackwardIndicator,
        skipForwardAmount,
        skipBackwardAmount,
        isSkipForwardAnimatingOut,
        isSkipBackwardAnimatingOut,
        showToast,
        toastMessage,
    } = state;

    return (
        <DesktopOverlay
            isLoading={isLoading}
            isPlaying={isPlaying}
            showSkipForwardIndicator={showSkipForwardIndicator}
            showSkipBackwardIndicator={showSkipBackwardIndicator}
            skipForwardAmount={skipForwardAmount}
            skipBackwardAmount={skipBackwardAmount}
            isSkipForwardAnimatingOut={isSkipForwardAnimatingOut}
            isSkipBackwardAnimatingOut={isSkipBackwardAnimatingOut}
            showToast={showToast}
            toastMessage={toastMessage}
            showControls={showControls}
            onTogglePlay={onTogglePlay}
            onSkipForward={onSkipForward}
            onSkipBackward={onSkipBackward}
            showMoreMenu={showMoreMenu}
            isProxied={isProxied}
            onToggleMoreMenu={onToggleMoreMenu}
            onMoreMenuMouseEnter={onMoreMenuMouseEnter}
            onMoreMenuMouseLeave={onMoreMenuMouseLeave}
            onCopyLink={onCopyLink}
            playbackRate={playbackRate}
            showSpeedMenu={showSpeedMenu}
            speeds={speeds}
            onToggleSpeedMenu={onToggleSpeedMenu}
            onSpeedChange={onSpeedChange}
            onSpeedMenuMouseEnter={onSpeedMenuMouseEnter}
            onSpeedMenuMouseLeave={onSpeedMenuMouseLeave}
        />
    );
}
