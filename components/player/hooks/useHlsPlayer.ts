import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { usePlayerSettings } from './usePlayerSettings';
import { filterM3u8Ad } from '@/lib/utils/m3u8-utils';

interface UseHlsPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    src: string;
    autoPlay?: boolean;
    onAutoPlayPrevented?: (error: Error) => void;
    onError?: (message: string) => void;
}

export function useHlsPlayer({
    videoRef,
    src,
    autoPlay = false,
    onAutoPlayPrevented,
    onError
}: UseHlsPlayerProps) {
    const hlsRef = useRef<Hls | null>(null);
    const { adFilter } = usePlayerSettings();

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        let hls: Hls | null = null;
        let objectUrl: string | null = null;

        // Check if HLS is supported natively (Safari, Mobile Chrome)
        const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl');

        if (Hls.isSupported()) {

            // Define custom loader class to intercept manifest loading
            // We use 'any' cast because default loader type might not be strictly exposed in all typings
            const DefaultLoader = (Hls as any).DefaultConfig.loader;

            class AdFilterLoader extends DefaultLoader {
                constructor(config: any) {
                    super(config);
                    const load = this.load.bind(this);

                    this.load = function (context: any, config: any, callbacks: any) {
                        if (adFilter && (context.type === 'manifest' || context.type === 'level')) {
                            const onSuccess = callbacks.onSuccess;
                            callbacks.onSuccess = function (response: any, stats: any, context: any, networkDetails: any) {
                                if (typeof response.data === 'string') {
                                    try {
                                        // Filter the content
                                        // console.log('[HLS] Intercepted playlist:', context.url);
                                        response.data = filterM3u8Ad(response.data, context.url);
                                    } catch (e) {
                                        console.warn('[HLS] Ad filter error:', e);
                                    }
                                }
                                onSuccess(response, stats, context, networkDetails);
                            };
                        }
                        load(context, config, callbacks);
                    };
                }
            }

            if (!isNativeHlsSupported || adFilter) {
                // If ad filtering is on, we force Hls.js even on native-supported desktop browsers
                // Exceptions might exist for iOS where MSE is strictly not available, check Hls.isSupported() result carefully.
                // Hls.isSupported() is false on iOS Safari usually, so this block won't run there.

                const config: any = {
                    // Worker & Performance
                    enableWorker: true,
                    lowLatencyMode: false,

                    // Buffer Settings
                    maxBufferLength: 60,
                    maxMaxBufferLength: 120,
                    maxBufferSize: 60 * 1000 * 1000,
                    maxBufferHole: 0.5,

                    // Start with more buffer
                    startFragPrefetch: true,

                    // ABR Settings
                    abrEwmaDefaultEstimate: 500000,
                    abrEwmaFastLive: 3,
                    abrEwmaSlowLive: 9,
                    abrEwmaFastVoD: 3,
                    abrEwmaSlowVoD: 9,
                    abrBandWidthFactor: 0.8,
                    abrBandWidthUpFactor: 0.7,

                    // Loading Settings
                    fragLoadingMaxRetry: 6,
                    fragLoadingRetryDelay: 1000,
                    fragLoadingMaxRetryTimeout: 64000,
                    manifestLoadingMaxRetry: 4,
                    manifestLoadingRetryDelay: 1000,
                    manifestLoadingMaxRetryTimeout: 64000,
                    levelLoadingMaxRetry: 4,
                    levelLoadingRetryDelay: 1000,
                    levelLoadingMaxRetryTimeout: 64000,

                    // Timeouts
                    fragLoadingTimeOut: 20000,
                    manifestLoadingTimeOut: 10000,
                    levelLoadingTimeOut: 10000,

                    // Backbuffer
                    backBufferLength: 30,
                };

                // Use custom loader if ad filtering is enabled
                if (adFilter) {
                    config.loader = AdFilterLoader;
                }

                hls = new Hls(config);
                hlsRef.current = hls;

                hls.loadSource(src);
                hls.attachMedia(video);

                // Auto Play Handler
                hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                    if (autoPlay && video.paused && data.frag.start === 0) {
                        video.play().catch(console.warn);
                    }
                });

                // Manifest Parsed Handler
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    // Check for HEVC
                    if (hls) {
                        const levels = hls.levels;
                        if (levels && levels.length > 0) {
                            const hasHEVC = levels.some(level =>
                                level.videoCodec?.toLowerCase().includes('hev') ||
                                level.videoCodec?.toLowerCase().includes('h265')
                            );
                            if (hasHEVC) {
                                console.warn('[HLS] ⚠️ HEVC detected');
                                onError?.('检测到 HEVC/H.265 编码，当前浏览器可能不支持');
                            }
                        }
                    }

                    if (autoPlay) {
                        video.play().catch((err) => {
                            // console.warn('[HLS] Autoplay prevented:', err);
                            onAutoPlayPrevented?.(err);
                        });
                    }
                });

                // Error Handling
                let networkErrorRetries = 0;
                let mediaErrorRetries = 0;
                const MAX_RETRIES = 3;

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                networkErrorRetries++;
                                // console.error(`[HLS] Network error (${networkErrorRetries}/${MAX_RETRIES})`, data);
                                if (networkErrorRetries <= MAX_RETRIES) {
                                    hls?.startLoad();
                                } else {
                                    onError?.('网络错误：无法加载视频流');
                                    hls?.destroy();
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                mediaErrorRetries++;
                                // console.error(`[HLS] Media error (${mediaErrorRetries}/${MAX_RETRIES})`, data);
                                if (mediaErrorRetries <= MAX_RETRIES) {
                                    hls?.recoverMediaError();
                                } else {
                                    onError?.('媒体错误：视频格式不支持或已损坏');
                                    hls?.destroy();
                                }
                                break;
                            default:
                                onError?.(`致命错误：${data.details}`);
                                hls?.destroy();
                                break;
                        }
                    }
                });
            } else {
                // Native HLS (Desktop Safari, no Filter)
                video.src = src;
            }
        } else if (isNativeHlsSupported) {
            // Native HLS (iOS, Mobile Safari)
            // Limitations: Native HLS cannot easily intercept sub-playlist requests.
            // We use fetch+blob for the master playlist as a best 'first-level' filter.
            // If the ad discontinuity is in the master playlist (rare for ads, common for periods), it works.
            // If it's in sub-playlists, it might fail unless we parse and blob those too (complex).

            if (adFilter) {
                fetch(src)
                    .then(res => res.text())
                    .then(content => {
                        // Check if it looks like a master playlist
                        if (content.includes('#EXT-X-STREAM-INF')) {
                            // Master playlist integration is hard with Blob on native.
                            // For now, playing original.
                            // TODO: Implement recursive fetch/blob for native if needed.
                            console.warn('[HLS Native] Ad filter on Master Playlist not fully supported on native.');
                            video.src = src;
                        } else {
                            const filtered = filterM3u8Ad(content, src);
                            const blob = new Blob([filtered], { type: 'application/vnd.apple.mpegurl' });
                            objectUrl = URL.createObjectURL(blob);
                            video.src = objectUrl;
                        }
                    })
                    .catch((e) => {
                        console.warn('[HLS Native] Fetch failed, fallback to src', e);
                        video.src = src;
                    });
            } else {
                video.src = src;
            }
        } else {
            console.error('[HLS] HLS not supported');
            onError?.('当前浏览器不支持 HLS 视频播放');
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src, videoRef, autoPlay, onAutoPlayPrevented, onError, adFilter]);
}
