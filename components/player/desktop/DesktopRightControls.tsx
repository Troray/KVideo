import React from 'react';
import { Icons } from '@/components/ui/Icon';



interface DesktopRightControlsProps {
    isFullscreen: boolean;
    isPiPSupported: boolean;
    isAirPlaySupported: boolean;
    isCastAvailable: boolean;
    isProxied?: boolean;
    onToggleFullscreen: () => void;
    onTogglePictureInPicture: () => void;
    onShowAirPlayMenu: () => void;
    onShowCastMenu: () => void;
}

export function DesktopRightControls({
    isFullscreen,
    isPiPSupported,
    isAirPlaySupported,
    isCastAvailable,
    isProxied,
    onToggleFullscreen,
    onTogglePictureInPicture,
    onShowAirPlayMenu,
    onShowCastMenu
}: DesktopRightControlsProps) {
    return (
        <div className="flex items-center gap-3">
            {/* Picture-in-Picture */}
            {
                isPiPSupported && (
                    <button
                        onClick={onTogglePictureInPicture}
                        className="btn-icon"
                        aria-label="Picture-in-Picture"
                        title="画中画"
                    >
                        <Icons.PictureInPicture size={20} />
                    </button>
                )
            }

            {/* AirPlay */}
            {
                isAirPlaySupported && (
                    <button
                        onClick={onShowAirPlayMenu}
                        className="btn-icon"
                        aria-label="AirPlay"
                        title="AirPlay"
                    >
                        <Icons.Airplay size={20} />
                    </button>
                )
            }

            {/* Google Cast */}
            {
                isCastAvailable && (
                    <button
                        onClick={onShowCastMenu}
                        className="btn-icon"
                        aria-label="Google Cast"
                        title="Google Cast"
                    >
                        <Icons.Cast size={20} />
                    </button>
                )
            }

            {/* Fullscreen */}
            <button
                onClick={onToggleFullscreen}
                className="btn-icon"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
                {isFullscreen ? <Icons.Minimize size={20} /> : <Icons.Maximize size={20} />}
            </button>
        </div >
    );
}
