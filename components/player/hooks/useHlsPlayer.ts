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
        let extraBlobs: string[] = [];

        // Check if HLS is supported natively (Safari, Mobile Chrome)
        const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl');

        if (Hls.isSupported()) {

            // Define custom loader class to intercept manifest loading
            // We use 'any' cast because default loader type might not be strictly exposed in all typings
            const DefaultLoader = (Hls as any).DefaultConfig.loader;

            class AdFilterLoader extends DefaultLoader {
                load(context: any, config: any, callbacks: any) {
                    if (adFilter && (context.type === 'manifest' || context.type === 'level')) {
                        const originalOnSuccess = callbacks.onSuccess;
                        callbacks.onSuccess = (response: any, stats: any, context: any, networkDetails: any) => {
                            if (typeof response.data === 'string') {
                                try {
                                    // Filter the content
                                    response.data = filterM3u8Ad(response.data, context.url);
                                } catch (e) {
                                    console.warn('[HLS] Ad filter error:', e);
                                }
                            }
                            originalOnSuccess(response, stats, context, networkDetails);
                        };
                    }
                    super.load(context, config, callbacks);
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
                                onError?.(`致命错误：${data.details || '未知错误'}`);
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
                const processMasterPlaylist = async (masterSrc: string) => {
                    try {
                        const response = await fetch(masterSrc);
                        const masterContent = await response.text();
                        const baseUrl = masterSrc.substring(0, masterSrc.lastIndexOf('/') + 1);

                        // If it's a simple playlist (no variants), just filter and play
                        if (!masterContent.includes('#EXT-X-STREAM-INF')) {
                            const filtered = filterM3u8Ad(masterContent, masterSrc);
                            const blob = new Blob([filtered], { type: 'application/vnd.apple.mpegurl' });
                            const blobUrl = URL.createObjectURL(blob);
                            // Track for cleanup (although currently we only track objectUrl variable, 
                            // for recursive we might need an array if we were strictly managing all, 
                            // but here strictly speaking only the master blob needs to necessarily be fed to video.src,
                            // HOWEVER, the sub-blobs are referenced by the master blob. 
                            // Browsers usually clean up Blob URLs on document unload, but strictly we should track them.
                            // For this specific hook scope, we'll try to track them if possible, or reliable on React cleanup.)
                            // limitation: The simple objectUrl variable is single. 
                            // We will need to extend cleanup to an array of URLs.
                            return blobUrl;
                        }

                        // It IS a master playlist. Recursive processing needed.
                        const lines = masterContent.split(/\r?\n/);
                        const processedLines: string[] = [];
                        const pendingFetches: Promise<void>[] = [];

                        // We need to keep track of created blobs to revoke them later
                        const createdBlobs: string[] = [];

                        // 1. Scan for URLs to fetch
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const trimmedLine = line.trim();

                            if (!trimmedLine) {
                                processedLines.push(line);
                                continue;
                            }

                            // Handle #EXT-X-MEDIA:URI="..."
                            if (trimmedLine.startsWith('#EXT-X-MEDIA') && trimmedLine.includes('URI="')) {
                                const uriMatch = trimmedLine.match(/URI="([^"]+)"/);
                                if (uriMatch) {
                                    const relativeUri = uriMatch[1];
                                    if (!relativeUri.startsWith('http')) {
                                        // Use URL constructor for resolution to handle ../ etc correctly
                                        const absoluteUrl = new URL(relativeUri, masterSrc).toString();

                                        // Start fetching this sub-playlist
                                        const p = fetch(absoluteUrl)
                                            .then(r => r.text())
                                            .then(subContent => {
                                                const filteredSub = filterM3u8Ad(subContent, absoluteUrl);
                                                const subBlob = new Blob([filteredSub], { type: 'application/vnd.apple.mpegurl' });
                                                const subBlobUrl = URL.createObjectURL(subBlob);
                                                createdBlobs.push(subBlobUrl); // Add to cleanup list

                                                // Replace in the line
                                                // Note: This simple replace might be risky if URI appears multiple times, but standard tags usually fine.
                                                // Safer regex replace
                                                processedLines[i] = processedLines[i].replace(`URI="${relativeUri}"`, `URI="${subBlobUrl}"`);
                                            })
                                            .catch(console.warn);
                                        pendingFetches.push(p);
                                    }
                                }
                                processedLines.push(line); // Will be updated by reference or index if we iterated differently? 
                                // Actually strings are immutable. We need to push the *potentially modified* line.
                                // But we are inside an async logic planning. 
                                // WAIT. We cannot modify processedLines[i] asynchronously comfortably if we push 'line' now.
                                // Strategy: We push the line. But we capture the INDEX 'i' for the promise to update `processedLines` array.
                                continue;
                            }

                            // Handle Stream Inf URL (the next line)
                            if (trimmedLine.startsWith('#EXT-X-STREAM-INF')) {
                                processedLines.push(line);
                                // The next line is the URL
                                if (i + 1 < lines.length) {
                                    const nextLine = lines[i + 1].trim();
                                    if (nextLine && !nextLine.startsWith('#')) {
                                        const relativeUri = nextLine;
                                        if (!relativeUri.startsWith('http')) {
                                            const absoluteUrl = new URL(relativeUri, masterSrc).toString();

                                            // Fetch sub playlist
                                            const p = fetch(absoluteUrl)
                                                .then(r => r.text())
                                                .then(subContent => {
                                                    const filteredSub = filterM3u8Ad(subContent, absoluteUrl);
                                                    const subBlob = new Blob([filteredSub], { type: 'application/vnd.apple.mpegurl' });
                                                    const subBlobUrl = URL.createObjectURL(subBlob);
                                                    createdBlobs.push(subBlobUrl);

                                                    // Update the URL line in processedLines
                                                    // processedLines index for next line is master lines index (i+1)
                                                    // But processedLines might have different length if we skipped something? No, we filter empty but push empty.
                                                    // However, to be safe, we should pre-fill processedLines with placeholder or carefully track indices.
                                                    // Easier: We are iterating master lines. processedLines[i] matches lines[i].
                                                    processedLines[i + 1] = subBlobUrl;
                                                })
                                                .catch(console.warn);
                                            pendingFetches.push(p);
                                        }
                                    }
                                }
                                continue;
                            }

                            // Just a regular line or URL that we noticed?
                            // For Master Playlist, URLs usually follow Stream Inf. 
                            // But what if it's just a URL line (simple playlist logic already handled above)?

                            // If we already handled logic in STREAM-INF, we just push the line. 
                            // But wait, the loop continues to i+1.
                            // We need to skip the next line if we handled it in STREAM-INF?
                            // Actually, in the STREAM-INF block above, I accessed i+1 but didn't increment i.
                            // So the loop will visit i+1 next.
                            // I should treat the URL line as a "Stream URL" pass if identified.

                            // Let's refine the loop to simple "Process Line"
                            processedLines.push(line);
                        }

                        // Wait for all sub-fetches
                        await Promise.all(pendingFetches);

                        // Join back
                        const finalMasterContent = processedLines.join('\n');
                        const masterBlob = new Blob([finalMasterContent], { type: 'application/vnd.apple.mpegurl' });
                        const masterBlobUrl = URL.createObjectURL(masterBlob);
                        createdBlobs.push(masterBlobUrl);

                        // Pass allow createdBlobs to be cleaned up outside?
                        // We need a way to store these extra blobs in the ref.
                        // Ugly hack: extend the objectUrl mechanism or use a separate ref.
                        // Since I can't easily add a new Ref hook inside this conditional block without breaking rules of hooks,
                        // I will assume `objectUrl` local var is not enough.
                        // BUT `useHlsPlayer` has `objectUrl` as a local let variable in useEffect.
                        // I should change logic to store array of blobs on the `hlsRef` or similar? No.
                        // The CleanUp function of useEffect has access to the scope.
                        // So I can declare `const allCreatedBlobs: string[] = []` at the top of useEffect.

                        // Let's rely on the top scope variable I will add.
                        return { masterBlobUrl, allBlobs: createdBlobs };
                    } catch (e) {
                        console.warn('[HLS Native] Recursive fetch failed', e);
                        throw e;
                    }
                };

                processMasterPlaylist(src).then((result) => {
                    if (typeof result === 'string') {
                        video.src = result;
                        objectUrl = result;
                    } else {
                        video.src = result.masterBlobUrl;
                        // We need to store allBlobs for cleanup. 
                        // Since `objectUrl` is a single string in the original code, 
                        // I will modify the cleanup function to handle an array if possible, 
                        // or just overwrite objectUrl to be one of them and lose track of others? NO. Memory leak.

                        // I will assign the array to a property on the cleaning function? No.
                        // I will move `allBlobs` to the outer scope of useEffect.
                        extraBlobs = result.allBlobs;
                    }
                }).catch(() => {
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
            extraBlobs.forEach(url => URL.revokeObjectURL(url));
        };
    }, [src, videoRef, autoPlay, onAutoPlayPrevented, onError, adFilter]);
}
