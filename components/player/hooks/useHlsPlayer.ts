import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

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

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        let hls: Hls | null = null;

        // Check if HLS is supported natively (Safari, Mobile Chrome)
        // We prefer native playback if available as it's usually more battery efficient
        const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl');

        if (Hls.isSupported()) {
            // Use hls.js for browsers without native support (Desktop Chrome, Firefox, Edge)
            // OR if we want to force hls.js for better control (optional, but sticking to native first is safer)

            // Note: Some desktop browsers (like Safari) support native HLS.
            // We usually prefer native, BUT sometimes native implementation is buggy or lacks features.
            // For now, we follow the standard pattern: Native first, then HLS.js.
            // EXCEPT for Chrome on Desktop which reports canPlayType as '' (false).

            if (!isNativeHlsSupported) {
                hls = new Hls({
                    // Worker & Performance
                    enableWorker: true,
                    lowLatencyMode: false, // Disable low latency for more stable playback

                    // Buffer Settings - More aggressive buffering for smoother playback
                    maxBufferLength: 60,           // Buffer up to 60 seconds ahead
                    maxMaxBufferLength: 120,       // Allow up to 2 minutes of buffer
                    maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size
                    maxBufferHole: 0.5,            // Allow small gaps in buffer

                    // Start with more buffer before playing
                    startFragPrefetch: true,       // Enable prefetching next fragment

                    // ABR (Adaptive Bitrate) Settings - Be more conservative
                    abrEwmaDefaultEstimate: 500000,     // Start with conservative bandwidth estimate (500kbps)
                    abrEwmaFastLive: 3,                 // Fast adaptation for live
                    abrEwmaSlowLive: 9,                 // Slow adaptation for live  
                    abrEwmaFastVoD: 3,                  // Fast adaptation for VoD
                    abrEwmaSlowVoD: 9,                  // Slow adaptation for VoD
                    abrBandWidthFactor: 0.8,            // Use 80% of estimated bandwidth (conservative)
                    abrBandWidthUpFactor: 0.7,          // Even more conservative when switching up

                    // Loading Settings - More retries and longer timeouts
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
                    fragLoadingTimeOut: 20000,     // 20 seconds for fragment loading
                    manifestLoadingTimeOut: 10000, // 10 seconds for manifest
                    levelLoadingTimeOut: 10000,    // 10 seconds for level

                    // Backbuffer - Keep some played content for seeking back
                    backBufferLength: 30,          // Keep 30 seconds of played content
                });
                hlsRef.current = hls;

                hls.loadSource(src);
                hls.attachMedia(video);

                hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                    // Force play if we have the first segment and it's not playing yet
                    // detailed: data.frag.sn is the sequence number
                    if (autoPlay && video.paused && data.frag.start === 0) {
                        video.play().catch(console.warn);
                    }
                });

                hls.on(Hls.Events.MANIFEST_PARSED, () => {

                    // Check for HEVC/H.265 codec (limited browser support)
                    if (hls) {
                        const levels = hls.levels;
                        if (levels && levels.length > 0) {
                            const hasHEVC = levels.some(level =>
                                level.videoCodec?.toLowerCase().includes('hev') ||
                                level.videoCodec?.toLowerCase().includes('h265')
                            );
                            if (hasHEVC) {
                                console.warn('[HLS] ⚠️ HEVC/H.265 codec detected - may not play in all browsers');
                                console.warn('[HLS] Supported: Safari with hardware acceleration, some Edge versions');
                                console.warn('[HLS] Not supported: Most Chrome/Firefox versions');
                                // Notify parent about potential codec issues
                                onError?.('检测到 HEVC/H.265 编码，当前浏览器可能不支持');
                            }
                        }
                    }

                    if (autoPlay) {
                        video.play().catch((err) => {
                            console.warn('[HLS] Autoplay prevented:', err);
                            onAutoPlayPrevented?.(err);
                        });
                    }
                });

                let networkErrorRetries = 0;
                let mediaErrorRetries = 0;
                const MAX_RETRIES = 3;

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                networkErrorRetries++;
                                console.error(`[HLS] Network error (${networkErrorRetries}/${MAX_RETRIES}), trying to recover...`, data);
                                if (networkErrorRetries <= MAX_RETRIES) {
                                    hls?.startLoad();
                                } else {
                                    console.error('[HLS] Too many network errors, giving up');
                                    onError?.('网络错误：无法加载视频流');
                                    hls?.destroy();
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                mediaErrorRetries++;
                                console.error(`[HLS] Media error (${mediaErrorRetries}/${MAX_RETRIES}), trying to recover...`, data);
                                if (mediaErrorRetries <= MAX_RETRIES) {
                                    hls?.recoverMediaError();
                                } else {
                                    console.error('[HLS] Too many media errors, giving up');
                                    onError?.('媒体错误：视频格式不支持或已损坏');
                                    hls?.destroy();
                                }
                                break;
                            default:
                                console.error('[HLS] Fatal error, cannot recover:', data);
                                onError?.(`致命错误：${data.details || '未知错误'}`);
                                hls?.destroy();
                                break;
                        }
                    } else {
                        // Non-fatal errors
                        console.warn('[HLS] Non-fatal error:', data.type, data.details);
                    }
                });
            } else {
                // Native HLS support
                video.src = src;
            }
        } else if (isNativeHlsSupported) {
            // Fallback for environments where Hls.js is not supported but native is (e.g. iOS without MSE?)
            video.src = src;
        } else {
            console.error('[HLS] HLS not supported in this browser');
            onError?.('当前浏览器不支持 HLS 视频播放');
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [src, videoRef, autoPlay, onAutoPlayPrevented, onError]);
}
