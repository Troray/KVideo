
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

    const processedLines = lines
        .filter(line => line.trim() !== '#EXT-X-DISCONTINUITY') // Filter out discontinuity tags safely
        .map(line => {
            const trimmedLine = line.trim();

            // Skip empty lines or existing absolute URLs
            if (!trimmedLine || trimmedLine.startsWith('http') || trimmedLine.startsWith('blob:')) {
                return line;
            }

            // If it's a tag (starts with #), checks if it's a URI tag (like #EXT-X-KEY:URI="...")
            if (trimmedLine.startsWith('#')) {
                // Handle URI attributes in tags
                // Example: #EXT-X-KEY:METHOD=AES-128,URI="key.php"
                if (trimmedLine.includes('URI="')) {
                    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                        if (uri.startsWith('http') || uri.startsWith('/')) return match;
                        return `URI="${basePath}${uri}"`;
                    });
                }
                return line;
            }

            // It's a segment URL (and we already checked it doesn't start with http)
            // If it starts with /, it's root-relative (we might need domain root)
            if (trimmedLine.startsWith('/')) {
                // For root-relative, we need the origin of the baseUrl
                try {
                    const urlObj = new URL(baseUrl);
                    return `${urlObj.origin}${trimmedLine}`;
                } catch (e) {
                    // Fallback if baseUrl is malformed
                    return trimmedLine;
                }
            }

            // Pure relative path
            return `${basePath}${trimmedLine}`;
        });

    return processedLines.join('\n');
}
