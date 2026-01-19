
/**
 * Utility functions for M3U8 playlist manipulation
 */

/**
 * Filters ads from specific M3U8 content by removing #EXT-X-DISCONTINUITY tags
 * and converting relative URLs to absolute URLs since Blob URLs lose context.
 * 
 * @param content The raw M3U8 content string
 * @param baseUrl The base URL of the M3U8 file (to resolve relative paths)
 * @returns The filtered M3U8 content
 */
export function filterM3u8Ad(content: string, baseUrl: string): string {
    if (!content) return '';

    // 1. Performance: Parse Keywords & Base URL ONLY ONCE
    const envKeywords = process.env.NEXT_PUBLIC_AD_KEYWORDS || '';
    const keywords = envKeywords
        ? envKeywords.split(/[\n,]/).map(k => k.trim()).filter(k => k)
        : ['/adjump/'];

    const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    let origin = '';
    try {
        origin = new URL(baseUrl).origin;
    } catch (e) { /* ignore */ }

    // 2. Hybrid Strategy: Global Scan
    // If NO ads are found in the entire file, we switch to AGGRESSIVE mode (remove all discontinuities).
    // If ads ARE found, we use SMART mode (only remove discontinuities near ads).
    const hasAdMatch = keywords.some(k => content.includes(k));

    const lines = content.split(/\r?\n/);
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 3. Smart Mode: Identify Ad Segments & Backtrack
        if (hasAdMatch && keywords.some(keyword => trimmedLine.includes(keyword))) {
            // Found Ad: Remove it and backtrack to remove associated metadata
            while (processedLines.length > 0) {
                const lastIndex = processedLines.length - 1;
                const lastLine = processedLines[lastIndex].trim();

                if (lastLine.startsWith('#EXTINF:') || lastLine === '#EXT-X-DISCONTINUITY') {
                    processedLines.pop();
                } else {
                    break;
                }
            }
            continue; // Skip the ad line itself
        }

        // 4. Discontinuity Handling
        if (trimmedLine === '#EXT-X-DISCONTINUITY') {
            if (!hasAdMatch) {
                // Aggressive Mode: No ads known, yet discontinuity exists. 
                // Treat as potential garbage/error and remove it to prevent black screen.
                continue;
            }
            // Smart Mode: Keep it for now. If it belongs to an ad, it'll be removed by the backtrack above.
            processedLines.push(line);
            continue;
        }

        // 5. General Cleanup & URL Normalization
        if (!trimmedLine || trimmedLine.startsWith('http') || trimmedLine.startsWith('blob:')) {
            processedLines.push(line);
            continue;
        }

        if (trimmedLine.startsWith('#')) {
            // Handle URI="..." in attributes (e.g. #EXT-X-KEY)
            if (trimmedLine.includes('URI="')) {
                processedLines.push(line.replace(/URI="([^"]+)"/g, (match, uri) => {
                    if (uri.startsWith('http') || uri.startsWith('/')) return match;
                    return `URI="${basePath}${uri}"`;
                }));
            } else {
                processedLines.push(line);
            }
            continue;
        }

        // 6. Resolve Relative URLs (for Blob support)
        if (trimmedLine.startsWith('/')) {
            processedLines.push(origin ? `${origin}${trimmedLine}` : trimmedLine);
        } else {
            processedLines.push(`${basePath}${trimmedLine}`);
        }
    }

    return processedLines.join('\n');
}
