'use client';

/**
 * PlayerSettings - Global settings for the video player
 * Following Liquid Glass design system
 */

import { Icons } from '@/components/ui/Icon';
import type { ProxyMode } from '@/lib/store/settings-store';

interface PlayerSettingsProps {
    proxyMode: ProxyMode;
    onProxyModeChange: (mode: ProxyMode) => void;
}

export function PlayerSettings({
    proxyMode,
    onProxyModeChange,
}: PlayerSettingsProps) {
    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
            <h2 className="text-xl font-semibold text-[var(--text-color)] mb-4">播放器设置</h2>

            <div className="space-y-6">

                {/* Proxy Mode Selection */}
                <div>
                    <h3 className="font-medium text-[var(--text-color)] mb-2 inline-flex items-center gap-2">
                        <Icons.Globe size={18} className="text-[var(--accent-color)]" />
                        代理播放模式
                    </h3>
                    <p className="text-sm text-[var(--text-color-secondary)] mb-4">
                        控制视频播放时的网络请求策略
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => onProxyModeChange('retry')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${proxyMode === 'retry'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="font-semibold">智能重试 (推荐)</div>
                            <div className="text-sm opacity-80 mt-1">直连优先，失败时尝试代理</div>
                        </button>
                        <button
                            onClick={() => onProxyModeChange('none')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${proxyMode === 'none'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="font-semibold">仅直连</div>
                            <div className="text-sm opacity-80 mt-1">不使用代理，失败则报错</div>
                        </button>
                        <button
                            onClick={() => onProxyModeChange('always')}
                            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${proxyMode === 'always'
                                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-[0_4px_12px_rgba(var(--accent-color-rgb),0.3)]'
                                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                }`}
                        >
                            <div className="font-semibold">总是代理</div>
                            <div className="text-sm opacity-80 mt-1">所有请求都通过代理转发</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
