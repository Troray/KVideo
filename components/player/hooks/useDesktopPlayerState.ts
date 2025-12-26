import { useState, useRef } from 'react';

export function useDesktopPlayerState() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volumeBarRef = useRef<HTMLDivElement>(null);

    // Refs for timeouts and tracking
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const speedMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const skipForwardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const skipBackwardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const volumeBarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDraggingProgressRef = useRef(false);
    const isDraggingVolumeRef = useRef(false);
    const mouseMoveThrottleRef = useRef<NodeJS.Timeout | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const moreMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isPiPSupported, setIsPiPSupported] = useState(false);
    const [isAirPlaySupported, setIsAirPlaySupported] = useState(false);
    const [isCastAvailable, setIsCastAvailable] = useState(false);
    const [isCasting, setIsCasting] = useState(false);
    const [skipForwardAmount, setSkipForwardAmount] = useState(0);
    const [skipBackwardAmount, setSkipBackwardAmount] = useState(0);
    const [showSkipForwardIndicator, setShowSkipForwardIndicator] = useState(false);
    const [showSkipBackwardIndicator, setShowSkipBackwardIndicator] = useState(false);
    const [isSkipForwardAnimatingOut, setIsSkipForwardAnimatingOut] = useState(false);
    const [isSkipBackwardAnimatingOut, setIsSkipBackwardAnimatingOut] = useState(false);
    const [showVolumeBar, setShowVolumeBar] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    return {
        refs: {
            videoRef,
            containerRef,
            progressBarRef,
            volumeBarRef,
            controlsTimeoutRef,
            speedMenuTimeoutRef,
            skipForwardTimeoutRef,
            skipBackwardTimeoutRef,
            volumeBarTimeoutRef,
            isDraggingProgressRef,
            isDraggingVolumeRef,
            mouseMoveThrottleRef,
            toastTimeoutRef,
            moreMenuTimeoutRef
        },
        state: {
            isPlaying, setIsPlaying,
            currentTime, setCurrentTime,
            duration, setDuration,
            volume, setVolume,
            isMuted, setIsMuted,
            isFullscreen, setIsFullscreen,
            showControls, setShowControls,
            isLoading, setIsLoading,
            playbackRate, setPlaybackRate,
            showSpeedMenu, setShowSpeedMenu,
            isPiPSupported, setIsPiPSupported,
            isAirPlaySupported, setIsAirPlaySupported,
            isCastAvailable, setIsCastAvailable,
            isCasting, setIsCasting,
            skipForwardAmount, setSkipForwardAmount,
            skipBackwardAmount, setSkipBackwardAmount,
            showSkipForwardIndicator, setShowSkipForwardIndicator,
            showSkipBackwardIndicator, setShowSkipBackwardIndicator,
            isSkipForwardAnimatingOut, setIsSkipForwardAnimatingOut,
            isSkipBackwardAnimatingOut, setIsSkipBackwardAnimatingOut,
            showVolumeBar, setShowVolumeBar,
            toastMessage, setToastMessage,
            showToast, setShowToast,
            showMoreMenu, setShowMoreMenu
        }
    };
}
