'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { getSourceName } from '@/lib/utils/source-names';
import { cleanHtmlText } from '@/lib/utils/format-utils';

interface VideoMetadataProps {
  videoData: any;
  source: string | null;
  title?: string | null;
}

function PosterThumbnail({ pic, name }: { pic?: string; name?: string }) {
  const [hasError, setHasError] = useState(false);

  if (!pic || hasError) {
    return (
      <div className="w-24 h-36 sm:w-32 sm:h-48 rounded-lg overflow-hidden flex-shrink-0 bg-[color-mix(in_srgb,var(--glass-bg)_80%,transparent)] border border-[var(--glass-border)] flex items-center justify-center">
        <Icons.Film size={36} className="text-[var(--text-color-secondary)] opacity-40" />
      </div>
    );
  }

  return (
    <div className="w-24 h-36 sm:w-32 sm:h-48 rounded-lg overflow-hidden flex-shrink-0 bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] border border-[var(--glass-border)]">
      <img
        src={pic}
        alt={name || ''}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function VideoMetadata({ videoData, source, title }: VideoMetadataProps) {
  return (
    <Card hover={false}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <PosterThumbnail pic={videoData?.vod_pic} name={videoData?.vod_name || title || ''} />
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--text-color)] mb-3">
            {videoData?.vod_name || title}
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {source && (
              <Badge variant="primary" className="backdrop-blur-md">
                <Icons.Check size={14} className="mr-1" />
                {getSourceName(source)}
              </Badge>
            )}
            {videoData?.type_name && (
              <Badge variant="secondary">{videoData.type_name}</Badge>
            )}
            {videoData?.vod_year && (
              <Badge variant="secondary">
                <Icons.Calendar size={14} className="mr-1" />
                {videoData.vod_year}
              </Badge>
            )}
            {videoData?.vod_area && (
              <Badge variant="secondary">
                <Icons.Globe size={14} className="mr-1" />
                {videoData.vod_area}
              </Badge>
            )}
          </div>
          {videoData?.vod_content && (
            <p className="text-sm sm:text-base text-[var(--text-secondary)] whitespace-pre-line">
              {cleanHtmlText(videoData.vod_content)}
            </p>
          )}
          {videoData?.vod_actor && (
            <p className="text-xs sm:text-sm text-[var(--text-tertiary)] mt-2">
              <span className="font-semibold">主演：</span>
              {cleanHtmlText(videoData.vod_actor)}
            </p>
          )}
          {videoData?.vod_director && (
            <p className="text-xs sm:text-sm text-[var(--text-tertiary)] mt-1">
              <span className="font-semibold">导演：</span>
              {cleanHtmlText(videoData.vod_director)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
