
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

    // 1. Get the base path (everything up to the last /)
    const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

    // 2. Split into lines to process each line
    const lines = content.split(/\r?\n/);
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 1. Remove Discontinuity Tags
        if (trimmedLine === '#EXT-X-DISCONTINUITY') {
            continue;
        }

        // 2. Identify Ad Segments
        // Key indicator: URL contains '/adjump/' or similar ad patterns
        if (trimmedLine.includes('/adjump/') || trimmedLine.includes('/video/adjump/')) {
            // This is an ad segment. We must NOT add it.
            // AND we must remove the preceding #EXTINF tag if it was already added.
            if (processedLines.length > 0) {
                const lastLine = processedLines[processedLines.length - 1];
                if (lastLine.trim().startsWith('#EXTINF:')) {
                    processedLines.pop(); // Remove the EXTINF line associated with this ad
                }
            }
            continue;
        }

        // Skip empty lines or existing absolute URLs
        if (!trimmedLine || trimmedLine.startsWith('http') || trimmedLine.startsWith('blob:')) {
            processedLines.push(line);
            continue;
        }

        // If it's a tag (starts with #), checks if it's a URI tag (like #EXT-X-KEY:URI="...")
        if (trimmedLine.startsWith('#')) {
            if (trimmedLine.startsWith('#EXTINF:') && lines[i + 1]) {
                // If this is EXTINF, checking ahead *might* be an optimization but iterating is safer.
                // We just push it for now; if next line is invalid/ad, we pop it then.
                processedLines.push(line);
                continue;
            }

            // Handle URI attributes in tags
            // Example: #EXT-X-KEY:METHOD=AES-128,URI="key.php"
            if (trimmedLine.includes('URI="')) {
                processedLines.push(line.replace(/URI="([^"]+)"/g, (match, uri) => {
                    if (uri.startsWith('http') || uri.startsWith('/')) return match;
                    return `URI="${basePath}${uri}"`;
                }));
                continue;
            }
            processedLines.push(line);
            continue;
        }

        // It's a segment URL (and we already checked it doesn't start with http)
        // If it starts with /, it's root-relative (we might need domain root)
        if (trimmedLine.startsWith('/')) {
            // For root-relative, we need the origin of the baseUrl
            try {
                const urlObj = new URL(baseUrl);
                processedLines.push(`${urlObj.origin}${trimmedLine}`);
            } catch (e) {
                // Fallback if baseUrl is malformed
                processedLines.push(trimmedLine);
            }
            continue;
        }

        // Pure relative path
        processedLines.push(`${basePath}${trimmedLine}`);
    }

    return processedLines.join('\n');
}
