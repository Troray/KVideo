/**
 * Heuristic Ad Detection Module
 * 
 * Provides block-based analysis for detecting ads in M3U8 playlists
 * using filename pattern matching and other heuristics.
 */

// Ad-related path keywords for scoring
export const AD_PATH_KEYWORDS = [
    'advert', 'preroll', 'midroll', 'postroll',
    'dai', 'vast', 'ima', 'adjump', 'commercial', 'sponsor'
];

/**
 * Represents a segment in the playlist
 */
interface Segment {
    url: string;
    duration: number;
    lineIndex: number;
}

/**
 * Represents a block of segments between DISCONTINUITY markers
 */
interface Block {
    segments: Segment[];
    startLineIndex: number;
    endLineIndex: number;
    hasCueTag: boolean;
}

/**
 * Pattern extracted from main content for comparison
 */
interface MainPattern {
    filenameRegex: RegExp | null;
    avgDuration: number;
    commonPrefix: string;
    pathPrefix: string; // Directory path prefix (e.g., "/20230907/73PWifvT/1392kb/hls/")
    isGlobalNTSC: boolean; // Whether >30% of total playlist segments use 30fps NTSC frame fractions
    isGlobal24fps: boolean; // Whether >35% of total playlist segments use 24fps/23.976fps frame fractions (.004, .002, .008)
}

/**
 * Parse M3U8 content into blocks separated by DISCONTINUITY markers
 */
export function parseBlocks(lines: string[]): Block[] {
    const blocks: Block[] = [];
    let currentBlock: Block = {
        segments: [],
        startLineIndex: 0,
        endLineIndex: 0,
        hasCueTag: false
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for CUE tags
        if (line.startsWith('#EXT-X-CUE-OUT') || line.startsWith('#EXT-X-CUE-IN')) {
            currentBlock.hasCueTag = true;
        }

        // DISCONTINUITY marks block boundary
        if (line === '#EXT-X-DISCONTINUITY') {
            if (currentBlock.segments.length > 0) {
                currentBlock.endLineIndex = i - 1;
                blocks.push(currentBlock);
            }
            currentBlock = {
                segments: [],
                startLineIndex: i + 1,
                endLineIndex: 0,
                hasCueTag: false
            };
            continue;
        }

        // Parse EXTINF and the following URL
        if (line.startsWith('#EXTINF:')) {
            const durationMatch = line.match(/#EXTINF:([\d.]+)/);
            const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

            // Next line should be the URL
            if (i + 1 < lines.length) {
                const url = lines[i + 1].trim();
                if (url && !url.startsWith('#')) {
                    currentBlock.segments.push({
                        url,
                        duration,
                        lineIndex: i + 1
                    });
                }
            }
        }
    }

    // Don't forget the last block
    if (currentBlock.segments.length > 0) {
        currentBlock.endLineIndex = lines.length - 1;
        blocks.push(currentBlock);
    }

    return blocks;
}

/**
 * Extract filename from URL (handles both relative and absolute URLs)
 */
function extractFilename(url: string): string {
    try {
        const path = url.includes('://') ? new URL(url).pathname : url;
        const parts = path.split('/');
        return parts[parts.length - 1] || '';
    } catch {
        return url.split('/').pop() || '';
    }
}

/**
 * Find common prefix among an array of strings
 */
function findCommonPrefix(strings: string[]): string {
    if (!strings || strings.length < 2) return '';

    let prefix = '';
    const first = strings[0];

    for (let i = 0; i < first.length; i++) {
        const char = first[i];
        if (strings.every(s => s[i] === char)) {
            prefix += char;
        } else {
            break;
        }
    }

    return prefix;
}

/**
 * Extract path prefix (directory) from URL
 * e.g., "/20230907/73PWifvT/1392kb/hls/" from "/20230907/73PWifvT/1392kb/hls/gFE6lwIk.ts"
 */
function extractPathPrefix(url: string): string {
    try {
        const path = url.includes('://') ? new URL(url).pathname : url;
        const lastSlash = path.lastIndexOf('/');
        return lastSlash >= 0 ? path.substring(0, lastSlash + 1) : '';
    } catch {
        const lastSlash = url.lastIndexOf('/');
        return lastSlash >= 0 ? url.substring(0, lastSlash + 1) : '';
    }
}

/**
 * Learn pattern from the largest block (assumed to be main content)
 */
export function learnMainPattern(blocks: Block[]): MainPattern {
    // Find the largest block by segment count (likely main content)
    const mainBlock = blocks.length > 0 ? blocks.reduce((largest, block) =>
        block.segments.length > largest.segments.length ? block : largest
    ) : null;

    if (!mainBlock || mainBlock.segments.length === 0) {
        return { filenameRegex: null, avgDuration: 0, commonPrefix: '', pathPrefix: '', isGlobalNTSC: false, isGlobal24fps: false };
    }

    // Extract filenames
    const filenames = mainBlock.segments.map(s => extractFilename(s.url));

    // Find common prefix
    const commonPrefix = findCommonPrefix(filenames);

    // Calculate average duration
    const totalDuration = mainBlock.segments.reduce((sum, s) => sum + s.duration, 0);
    const avgDuration = totalDuration / mainBlock.segments.length;

    // Try to build a regex pattern from the filenames
    // Common patterns: "0000001.ts", "seg-1.ts", "segment_001.ts"
    let filenameRegex: RegExp | null = null;
    if (commonPrefix.length >= 2) {
        // Escape special regex characters in prefix
        const escapedPrefix = commonPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filenameRegex = new RegExp(`^${escapedPrefix}`);
    }

    // Extract path prefix (directory path without filename)
    // e.g., "/20230907/73PWifvT/1392kb/hls/" from "/20230907/73PWifvT/1392kb/hls/gFE6lwIk.ts"
    const firstUrl = mainBlock.segments[0].url;
    const pathPrefix = extractPathPrefix(firstUrl);

    // Calculate global NTSC 30fps and 24fps/23.976fps fraction ratios across all blocks in the playlist
    const ntscFractions = new Set([33, 67, 133, 167, 233, 267, 333, 367, 433, 467, 533, 567, 633, 667, 733, 767, 833, 867, 933, 967]);
    const fps24Fractions = new Set([2, 4, 6, 8, 12, 16, 20, 24]);
    let totalSegCount = 0;
    let ntscSegCount = 0;
    let fps24SegCount = 0;

    blocks.forEach(b => {
        b.segments.forEach(s => {
            totalSegCount++;
            const msFraction = Math.round((s.duration % 1) * 1000);
            if (ntscFractions.has(msFraction)) ntscSegCount++;
            if (fps24Fractions.has(msFraction)) fps24SegCount++;
        });
    });

    const isGlobalNTSC = totalSegCount > 0 && (ntscSegCount / totalSegCount) > 0.3;
    const isGlobal24fps = totalSegCount > 0 && (fps24SegCount / totalSegCount) > 0.35;

    return { filenameRegex, avgDuration, commonPrefix, pathPrefix, isGlobalNTSC, isGlobal24fps };
}

/**
 * Find blocks that share an identical sequence of segment durations (fingerprint)
 * with another block in the playlist.
 * 
 * If a block (with >= 3 segments) has an identical duration signature
 * as another block in the playlist, and it is not the main content block,
 * it is extremely likely to be a repeated inserted ad block.
 */
export function findDuplicateSignatureBlockIndices(blocks: Block[]): Set<number> {
    const duplicateIndices = new Set<number>();
    if (!blocks || blocks.length < 2) return duplicateIndices;

    // Find the largest block (assumed main content block)
    let mainBlockIndex = -1;
    let maxSegments = 0;

    blocks.forEach((block, idx) => {
        if (block.segments.length > maxSegments) {
            maxSegments = block.segments.length;
            mainBlockIndex = idx;
        }
    });

    let mainAvgDuration = 0;
    if (mainBlockIndex >= 0 && blocks[mainBlockIndex].segments.length > 0) {
        const mainSegs = blocks[mainBlockIndex].segments;
        mainAvgDuration = mainSegs.reduce((sum, s) => sum + s.duration, 0) / mainSegs.length;
    }

    // Map signature -> array of block indices
    const signatureMap = new Map<string, number[]>();

    blocks.forEach((block, idx) => {
        // Require at least 3 segments to form a signature to prevent accidental single-segment collisions
        if (block.segments.length < 3) return;

        const firstDur = block.segments[0].duration;
        const isUniformBlock = block.segments.every(s => Math.abs(s.duration - firstDur) < 0.005);

        // If the block is uniform (e.g. 2.0s, 2.0s, 2.0s) AND its duration matches the main content's duration (e.g. zuida.m3u8 where main content is also 2.0s),
        // it represents normal main video chunking and must NOT be flagged as an ad signature.
        if (isUniformBlock && mainAvgDuration > 0 && Math.abs(firstDur - mainAvgDuration) < 0.05) {
            return;
        }

        // Signature based on segment durations rounded to 3 decimal places (milliseconds precision)
        const signature = block.segments.map(s => s.duration.toFixed(3)).join(',');
        
        const existing = signatureMap.get(signature) || [];
        existing.push(idx);
        signatureMap.set(signature, existing);
    });

    // Flag blocks whose signatures appear 2 or more times (up to 30% of total blocks, at least 3)
    const maxAllowedAdOccurrences = Math.max(3, blocks.length * 0.3);
    signatureMap.forEach((indices) => {
        if (indices.length >= 2 && indices.length <= maxAllowedAdOccurrences) {
            indices.forEach(idx => {
                if (idx !== mainBlockIndex) {
                    duplicateIndices.add(idx);
                }
            });
        }
    });

    return duplicateIndices;
}

/**
 * Score a block for ad likelihood based on heuristics
 * Returns a score where higher = more likely to be an ad
 */
export function scoreBlock(
    block: Block,
    mainPattern: MainPattern,
    extraKeywords: string[] = [],
    isDuplicateSignature: boolean = false
): number {
    let score = 0;

    // If block has CUE tag or matches a duplicate signature, it's definitely an ad
    if (block.hasCueTag || isDuplicateSignature) {
        return 10; // Max score
    }

    // Check path keywords (Built-in + Custom)
    // We filter out very short custom keywords to avoid false positives in scoring
    const safeExtraKeywords = extraKeywords.filter(k => k.length > 2);
    const allKeywords = [...AD_PATH_KEYWORDS, ...safeExtraKeywords];

    for (const segment of block.segments) {
        const urlLower = segment.url.toLowerCase();
        for (const keyword of allKeywords) {
            if (urlLower.includes(keyword.toLowerCase())) {
                score += 2.5;
                break; // Only count once per segment
            }
        }
    }

    // Check filename pattern mismatch
    if (mainPattern.filenameRegex) {
        const mismatchCount = block.segments.filter(s => {
            if (!mainPattern.filenameRegex) return false; // No pattern to compare against
            const filename = extractFilename(s.url);
            return !mainPattern.filenameRegex.test(filename);
        }).length;

        if (mismatchCount === block.segments.length && block.segments.length > 0) {
            score += 1.5; // All filenames differ from main pattern
        }
    }

    // **KEY FEATURE**: Check path prefix mismatch (e.g., different date/folder/bitrate)
    // This is the most reliable indicator for ads that come from different CDN paths
    if (mainPattern.pathPrefix !== undefined && block.segments.length > 0) {
        const pathMismatchCount = block.segments.filter(s => {
            const segmentPathPrefix = extractPathPrefix(s.url);
            return segmentPathPrefix !== mainPattern.pathPrefix;
        }).length;

        if (pathMismatchCount === block.segments.length) {
            // ALL segments have different path prefix - strong ad indicator
            score += 5.0;
        }
    }

    // **ENHANCEMENT**: Duration anomaly heuristic for mid-roll inserted ad blocks
    // If main content has a consistent segment duration (e.g., 6.0s or 10.0s),
    // but this small block has a vastly different duration signature (e.g., 2.0s),
    // add additional score when combined with filename or path mismatch.
    if (mainPattern.avgDuration > 0 && block.segments.length > 0 && block.segments.length <= 6) {
        const blockAvgDuration = block.segments.reduce((sum, s) => sum + s.duration, 0) / block.segments.length;
        const durationRatio = blockAvgDuration / mainPattern.avgDuration;
        if (durationRatio < 0.6 || durationRatio > 1.8) {
            score += 1.5;
        }
    }

    // **KEY FEATURE**: Framerate fraction grid anomaly detection (30fps vs 25fps inserted ad detection)
    // Spliced NTSC 30fps/60fps ads inserted into 25fps/50fps streams create distinct fractional ms (.333, .667, .867, .133, .733).
    // Note: Only triggered if the main content itself is NOT a global NTSC 30fps stream.
    if (!mainPattern.isGlobalNTSC && block.segments.length > 0 && block.segments.length <= 10) {
        const ntscFractions = new Set([33, 67, 133, 167, 233, 267, 333, 367, 433, 467, 533, 567, 633, 667, 733, 767, 833, 867, 933, 967]);
        let ntscMatches = 0;
        block.segments.forEach(s => {
            const msFraction = Math.round((s.duration % 1) * 1000);
            if (ntscFractions.has(msFraction)) ntscMatches++;
        });
        if (ntscMatches === block.segments.length) {
            score += 5.0; // Definite framerate anomaly for inserted ad block
        }
    }

    // **KEY FEATURE**: Framerate fraction grid anomaly detection (25fps/integer ads inserted into 24fps/23.976fps streams)
    // 24fps movie streams have fractional ms (.004, .002, .008). 25fps/PAL inserted ads use exact integer milliseconds (.000).
    if (mainPattern.isGlobal24fps && block.segments.length > 0 && block.segments.length <= 10) {
        let int0Count = 0;
        block.segments.forEach(s => {
            const msFraction = Math.round((s.duration % 1) * 1000);
            if (msFraction === 0) int0Count++;
        });
        if (int0Count >= block.segments.length - 1 && int0Count >= 2) {
            score += 5.0; // Definite 25fps integer ad inserted into 24fps movie stream
        }
    }

    return score;
}

/**
 * Threshold configuration
 */
export const THRESHOLDS = {
    HIGH: 5.0,   // Definitely an ad
    LOW: 3.0    // Possibly an ad (for future "fuzzy" mode)
};

/**
 * Determine if a block should be filtered based on its score
 */
export function shouldFilterBlock(score: number, threshold: number = THRESHOLDS.HIGH): boolean {
    return score >= threshold;
}
