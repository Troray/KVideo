import React from 'react';
import { createPortal } from 'react-dom';

interface DesktopSpeedMenuProps {
    showSpeedMenu: boolean;
    playbackRate: number;
    speeds: number[];
    onSpeedChange: (speed: number) => void;
    onToggleSpeedMenu: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export function DesktopSpeedMenu({
    showSpeedMenu,
    playbackRate,
    speeds,
    onSpeedChange,
    onToggleSpeedMenu,
    onMouseEnter,
    onMouseLeave
}: DesktopSpeedMenuProps) {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });

    React.useEffect(() => {
        if (showSpeedMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 10,
                left: rect.right // Align with right edge
            });
        }
    }, [showSpeedMenu]);

    const handleToggle = () => {
        if (!showSpeedMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 10,
                left: rect.right // Align with right edge
            });
        }
        onToggleSpeedMenu();
    };


    const MenuContent = (
        <div
            className="fixed z-[9999] bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] rounded-[var(--radius-2xl)] border border-[var(--glass-border)] shadow-[var(--shadow-md)] p-2 min-w-[5rem]"
            style={{
                top: menuPosition.top,
                left: menuPosition.left,
                transform: 'translateX(-100%)', // Align right edge
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {speeds.map((speed) => (
                <button
                    key={speed}
                    onClick={() => onSpeedChange(speed)}
                    className={`w-full px-3 py-2 rounded-[var(--radius-2xl)] text-sm font-medium transition-colors ${playbackRate === speed
                        ? 'bg-[var(--accent-color)] text-white'
                        : 'text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_15%,transparent)]'
                        }`}
                >
                    {speed}x
                </button>
            ))}
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="group flex items-center justify-center w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 text-white/90 font-medium text-sm"
                aria-label="Playback speed"
            >
                {playbackRate}x
            </button>

            {/* Speed Menu (Portal) */}
            {showSpeedMenu && typeof document !== 'undefined' && createPortal(MenuContent, document.body)}
        </div>
    );
}
