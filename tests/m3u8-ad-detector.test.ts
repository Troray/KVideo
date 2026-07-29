import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findDuplicateSignatureBlockIndices,
  parseBlocks,
  scoreBlock,
  learnMainPattern,
} from '../lib/utils/m3u8-ad-detector';
import { filterM3u8Ad } from '../lib/utils/m3u8-utils';

function buildBlockPlaylist(blocks: number[][]): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:10'];
  blocks.forEach((durations, blockIndex) => {
    if (blockIndex > 0) {
      lines.push('#EXT-X-DISCONTINUITY');
    }
    durations.forEach((duration, segmentIndex) => {
      lines.push(`#EXTINF:${duration.toFixed(3)},`);
      lines.push(`https://cdn.example.com/content/seg-${blockIndex}-${segmentIndex}.ts`);
    });
  });
  lines.push('#EXT-X-ENDLIST');
  return lines.join('\n');
}

test('findDuplicateSignatureBlockIndices flags repeated ad duration fingerprints', () => {
  const playlist = buildBlockPlaylist([
    [2.0, 2.0, 2.0], // ad A
    [6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0], // main content
    [2.0, 2.0, 2.0], // ad A again
    [1.5, 1.5, 1.5], // unique short block
  ]);
  const blocks = parseBlocks(playlist.split('\n'));
  const duplicates = findDuplicateSignatureBlockIndices(blocks);

  assert.equal(duplicates.has(0), true);
  assert.equal(duplicates.has(2), true);
  assert.equal(duplicates.has(1), false);
  assert.equal(duplicates.has(3), false);
});

test('scoreBlock returns max score for duplicate signature blocks', () => {
  const playlist = buildBlockPlaylist([
    [2.0, 2.0, 2.0],
    [6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0],
    [2.0, 2.0, 2.0],
  ]);
  const blocks = parseBlocks(playlist.split('\n'));
  const mainPattern = learnMainPattern(blocks);
  const score = scoreBlock(blocks[0], mainPattern, [], true);
  assert.equal(score, 10);
});

test('filterM3u8Ad removes duplicate-signature ad blocks while keeping main content', () => {
  const playlist = buildBlockPlaylist([
    [2.002, 2.002, 2.002],
    [6.006, 6.006, 6.006, 6.006, 6.006, 6.006, 6.006, 6.006, 6.006, 6.006],
    [2.002, 2.002, 2.002],
  ]);

  const filtered = filterM3u8Ad(playlist, 'https://cdn.example.com/content/index.m3u8', 'heuristic');

  assert.equal(filtered.includes('seg-0-0.ts'), false);
  assert.equal(filtered.includes('seg-2-0.ts'), false);
  assert.equal(filtered.includes('seg-1-0.ts'), true);
  assert.equal(filtered.includes('seg-1-9.ts'), true);
});

test('filterM3u8Ad still strips interstitial DATERANGE metadata', () => {
  const playlist = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-DATERANGE:ID="ad1",CLASS="com.apple.hls.interstitial",START-DATE="2024-01-01T00:00:00Z",X-ASSET-URI="https://ads.example.com/ad.m3u8"',
    '#EXTINF:6.000,',
    'https://cdn.example.com/main/seg-0.ts',
    '#EXT-X-ENDLIST',
  ].join('\n');

  const filtered = filterM3u8Ad(playlist, 'https://cdn.example.com/main/index.m3u8', 'heuristic');
  assert.equal(filtered.includes('com.apple.hls.interstitial'), false);
  assert.equal(filtered.includes('seg-0.ts'), true);
});

test('filterM3u8Ad executes valid custom TS/JS script in sandbox', () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:5.000,',
    'https://cdn.example.com/content/ad-segment.ts',
    '#EXTINF:10.000,',
    'https://cdn.example.com/content/main-segment.ts',
  ].join('\n');

  const customScript = `
    function filterAdsFromM3U8(content: string, baseUrl: string): string {
      return content.split('\\n').filter(line => !line.includes('ad-segment.ts')).join('\\n');
    }
  `;

  const filtered = filterM3u8Ad(playlist, 'https://cdn.example.com/content/index.m3u8', 'heuristic', [], customScript);
  assert.equal(filtered.includes('ad-segment.ts'), false);
  assert.equal(filtered.includes('main-segment.ts'), true);
});

test('filterM3u8Ad gracefully falls back to built-in rules when custom script throws runtime error', () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:5.000,',
    'https://cdn.example.com/content/sponsor-ad.ts',
    '#EXTINF:10.000,',
    'https://cdn.example.com/content/main-segment.ts',
  ].join('\n');

  const brokenScript = `
    function filterAdsFromM3U8(content: string): string {
      throw new Error("Syntax error or intentional bug");
    }
  `;

  const filtered = filterM3u8Ad(playlist, 'https://cdn.example.com/content/index.m3u8', 'heuristic', ['sponsor'], brokenScript);
  assert.equal(filtered.includes('sponsor-ad.ts'), false);
  assert.equal(filtered.includes('main-segment.ts'), true);
});

test('filterM3u8Ad detects and strips 30fps/NTSC framerate fraction anomaly inserted ad blocks', () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-0.ts',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-1.ts',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-2.ts',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-3.ts',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-4.ts',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:4.867,',
    'https://cdn.example.com/content/ad-0.ts',
    '#EXTINF:3.333,',
    'https://cdn.example.com/content/ad-1.ts',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-5.ts',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-6.ts',
    '#EXTINF:4.000,',
    'https://cdn.example.com/content/main-7.ts',
  ].join('\n');

  const filtered = filterM3u8Ad(playlist, 'https://cdn.example.com/content/index.m3u8', 'heuristic');
  assert.equal(filtered.includes('ad-0.ts'), false);
  assert.equal(filtered.includes('ad-1.ts'), false);
  assert.equal(filtered.includes('main-0.ts'), true);
  assert.equal(filtered.includes('main-7.ts'), true);
});

test('filterM3u8Ad detects and strips Multi-CDN domain/path prefix mismatch ad blocks', () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:6.000,',
    'https://media-cdn.video.com/2026/ep01/hls/seg-0.ts',
    '#EXTINF:6.000,',
    'https://media-cdn.video.com/2026/ep01/hls/seg-1.ts',
    '#EXTINF:6.000,',
    'https://media-cdn.video.com/2026/ep01/hls/seg-2.ts',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:15.000,',
    'https://ad-server.net/campaign/preroll/ad-0.ts',
    '#EXTINF:15.000,',
    'https://ad-server.net/campaign/preroll/ad-1.ts',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:6.000,',
    'https://media-cdn.video.com/2026/ep01/hls/seg-3.ts',
    '#EXTINF:6.000,',
    'https://media-cdn.video.com/2026/ep01/hls/seg-4.ts',
  ].join('\n');

  const filtered = filterM3u8Ad(playlist, 'https://media-cdn.video.com/2026/ep01/hls/index.m3u8', 'heuristic');
  assert.equal(filtered.includes('ad-server.net'), false);
  assert.equal(filtered.includes('seg-0.ts'), true);
  assert.equal(filtered.includes('seg-4.ts'), true);
});

test('filterM3u8Ad protects global 30fps/NTSC feature film streams with 0 false positives', () => {
  const playlist = [
    '#EXTM3U',
    '#EXTINF:4.033,',
    'https://cdn.example.com/movie/seg-0.ts',
    '#EXTINF:4.867,',
    'https://cdn.example.com/movie/seg-1.ts',
    '#EXTINF:3.333,',
    'https://cdn.example.com/movie/seg-2.ts',
    '#EXTINF:4.167,',
    'https://cdn.example.com/movie/seg-3.ts',
    '#EXT-X-DISCONTINUITY',
    '#EXTINF:4.033,',
    'https://cdn.example.com/movie/seg-4.ts',
    '#EXTINF:4.867,',
    'https://cdn.example.com/movie/seg-5.ts',
    '#EXTINF:3.333,',
    'https://cdn.example.com/movie/seg-6.ts',
  ].join('\n');

  const filtered = filterM3u8Ad(playlist, 'https://cdn.example.com/movie/index.m3u8', 'heuristic');
  assert.equal(filtered.includes('seg-0.ts'), true);
  assert.equal(filtered.includes('seg-3.ts'), true);
  assert.equal(filtered.includes('seg-6.ts'), true);
});
