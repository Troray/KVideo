import React from 'react';
import { DesktopProgressBar } from './DesktopProgressBar';
import { DesktopLeftControls } from './DesktopLeftControls';
import { DesktopRightControls } from './DesktopRightControls';

interface DesktopControlsProps {
    showControls: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    playbackRate: number;
    showSpeedMenu: boolean;
    showMoreMenu: boolean;
    showVolumeBar: boolean;
    isPiPSupported: boolean;
    isAirPlaySupported: boolean;
    isCastAvailable: boolean;
    isProxied?: boolean;
    progressBarRef: React.RefObject<HTMLDivElement | null>;
    volumeBarRef: React.RefObject<HTMLDivElement | null>;
    onTogglePlay: () => void;
    onSkipForward: () => void;
    onSkipBackward: () => void;
    onToggleMute: () => void;
    onVolumeChange: (e: React.MouseEvent<HTMLDivElement>) => void;
    onVolumeMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onToggleFullscreen: () => void;
    onTogglePictureInPicture: () => void;
    onShowAirPlayMenu: () => void;
    onShowCastMenu: () => void;
    onToggleSpeedMenu: () => void;
    onToggleMoreMenu: () => void;
    onSpeedChange: (speed: number) => void;
    onCopyLink: (type?: 'original' | 'proxy') => void;
    onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onProgressMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onSpeedMenuMouseEnter: () => void;
    onSpeedMenuMouseLeave: () => void;
    onMoreMenuMouseEnter: () => void;
    onMoreMenuMouseLeave: () => void;
    formatTime: (seconds: number) => string;
    speeds: number[];
}

export function DesktopControls(props: DesktopControlsProps) {
    const {
        showControls,
        currentTime,
        duration,
        progressBarRef,
        onProgressClick,
        onProgressMouseDown,
        formatTime,
    } = props;

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
            style={{ pointerEvents: showControls ? 'auto' : 'none' }}
        >
            {/* Progress Bar */}
            <DesktopProgressBar
                progressBarRef={progressBarRef}
                currentTime={currentTime}
                duration={duration}
                onProgressClick={onProgressClick}
                onProgressMouseDown={onProgressMouseDown}
            />

            {/* Controls Bar */}
            <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-2">
                <div className="flex items-center justify-between gap-4">
                    <DesktopLeftControls {...props} formatTime={formatTime} />
                    <DesktopRightControls {...props} />
                </div>
            </div>
        </div>
    );
}
