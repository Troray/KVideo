import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    return NextResponse.json({
        version: 1,
        enabled: true,
        updatedAt: '2026-07-28T22:30:00Z',
        code: `// Dynamic M3U8 Ad Filtering Script (Cloud Sandbox Engine)
function filterAdsFromM3U8(content, baseUrl) {
  if (!content) return content;
  var lines = content.split(/\\r?\\n/);
  var result = [];
  var insideAdBlock = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    if (trimmed.startsWith('#EXT-X-DATERANGE:') && trimmed.includes('CLASS="com.apple.hls.interstitial"')) {
      continue;
    }
    if (trimmed.startsWith('#EXT-X-CUE-OUT')) {
      insideAdBlock = true;
      if (result.length > 0 && result[result.length - 1].trim() === '#EXT-X-DISCONTINUITY') {
        result.pop();
      }
      continue;
    }
    if (trimmed.startsWith('#EXT-X-CUE-IN')) {
      insideAdBlock = false;
      if (i + 1 < lines.length && lines[i + 1].trim() === '#EXT-X-DISCONTINUITY') {
        i++;
      }
      continue;
    }
    if (insideAdBlock) {
      continue;
    }

    result.push(line);
  }

  return result.join('\\n');
}`,
    });
}
