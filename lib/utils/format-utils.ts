/**
 * Formatting utilities for time and dates
 */

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format timestamp to relative date (今天, 昨天, X天前, or date)
 */
export function formatDate(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;


    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * Clean HTML tags and decode HTML entities, normalizing spaces and line breaks.
 */
export function cleanHtmlText(text?: string | null): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Replace common block/line-break HTML tags with newlines
    cleaned = cleaned
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n');

    // 2. Strip remaining HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // 3. Decode HTML entities (including double-encoded &amp;nbsp;)
    cleaned = cleaned
        .replace(/&amp;/gi, '&')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&ensp;/gi, ' ')
        .replace(/&emsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'");

    // 4. Decode numeric HTML entities (e.g. &#160; or &#xA0;)
    cleaned = cleaned
        .replace(/&#(\d+);/g, (_, dec) => {
            try {
                return String.fromCharCode(parseInt(dec, 10));
            } catch {
                return '';
            }
        })
        .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
            try {
                return String.fromCharCode(parseInt(hex, 16));
            } catch {
                return '';
            }
        });

    // 5. Treat 2 or more consecutive spaces/nbsp/full-width spaces as paragraph breaks (\n\n)
    // (CMS sources often use consecutive &nbsp; or space padding instead of <br>/<p> for paragraph breaks)
    cleaned = cleaned.replace(/[ \t\u00a0\u3000]{2,}/g, '\n\n');

    // 6. Clean leading and trailing spaces for each line
    cleaned = cleaned
        .split('\n')
        .map(line => line.trim())
        .join('\n');

    // 7. Collapse 3 or more consecutive newlines into 2 (max double newline for paragraphs)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
}

