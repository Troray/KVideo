'use client';

import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { LatencyBadge } from '@/components/ui/LatencyBadge';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';

interface Episode {
  name?: string;
  url: string;
}

export interface GroupedSource {
  id: string | number;
  source: string;
  sourceName?: string;
  name?: string;
  latency?: number;
  pic?: string;
}

interface EpisodeListProps {
  episodes: Episode[] | null;
  currentEpisode: number;
  isReversed?: boolean;
  onEpisodeClick: (episode: Episode, index: number) => void;
  onToggleReverse?: (reversed: boolean) => void;
  // Merged sources integration props
  sources?: GroupedSource[];
  currentSourceId?: string | number;
  onSourceChange?: (source: GroupedSource) => void;
}

function formatEpisodeDisplay(name: string | undefined, originalIndex: number, totalCount: number) {
  const padLength = totalCount >= 100 ? 3 : 2;
  const defaultNum = String(originalIndex + 1).padStart(padLength, '0');

  if (!name) return defaultNum;

  const trimmed = name.trim();
  // Match "第 1 集", "第1集", "第01集", "第 001 集"
  const epMatch = trimmed.match(/^第\s*(\d+)\s*集$/);
  if (epMatch) {
    const num = parseInt(epMatch[1], 10);
    return String(num).padStart(padLength, '0');
  }

  // If pure digits like "1", "01"
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return String(num).padStart(padLength, '0');
  }

  // Non-standard episode title (e.g. "预告", "特别篇", "OVA"), keep custom title
  return trimmed;
}

function SourceThumbnail({ pic, alt }: { pic?: string; alt?: string }) {
  const [hasError, setHasError] = useState(false);

  if (!pic || hasError) {
    return (
      <div className="w-12 h-16 rounded-[var(--radius-xl)] overflow-hidden flex-shrink-0 bg-[color-mix(in_srgb,var(--glass-bg)_80%,transparent)] border border-[var(--glass-border)] flex items-center justify-center">
        <Icons.Film size={20} className="text-[var(--text-color-secondary)] opacity-40" />
      </div>
    );
  }

  return (
    <div className="w-12 h-16 rounded-[var(--radius-xl)] overflow-hidden flex-shrink-0 bg-[color-mix(in_srgb,var(--glass-bg)_50%,transparent)] border border-[var(--glass-border)]">
      <Image
        src={pic}
        alt={alt || ''}
        width={48}
        height={64}
        className="w-full h-full object-cover"
        unoptimized
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

const PAGE_SIZE = 50;

export function EpisodeList({
  episodes,
  currentEpisode,
  isReversed = false,
  onEpisodeClick,
  onToggleReverse,
  sources,
  currentSourceId,
  onSourceChange,
}: EpisodeListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Range bar scroll & drag refs
  const rangeBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Tab switcher state: 'episodes' (选集) vs 'sources' (播放源)
  const [activeTab, setActiveTab] = useState<'episodes' | 'sources'>('episodes');

  // Latency state for sources
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [isPingLoading, setIsPingLoading] = useState(false);

  // Wheel scroll handler for page range bar
  const handleRangeWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!rangeBarRef.current) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      rangeBarRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Mouse drag scroll handlers for page range bar
  const handleRangeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rangeBarRef.current) return;
    setIsDraggingRange(true);
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX - rangeBarRef.current.offsetLeft;
    dragScrollLeftRef.current = rangeBarRef.current.scrollLeft;
  }, []);

  const handleRangeMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRange || !rangeBarRef.current) return;
    e.preventDefault();
    const x = e.pageX - rangeBarRef.current.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.5;
    if (Math.abs(walk) > 3) {
      hasDraggedRef.current = true;
    }
    rangeBarRef.current.scrollLeft = dragScrollLeftRef.current - walk;
  }, [isDraggingRange]);

  const handleRangeMouseUpOrLeave = useCallback(() => {
    setIsDraggingRange(false);
  }, []);

  // Initialize latencies from sources
  useEffect(() => {
    if (!sources) return;
    const initial: Record<string, number> = {};
    sources.forEach((s) => {
      if (s.latency !== undefined) {
        initial[s.source] = s.latency;
      }
    });
    setLatencies(initial);
  }, [sources]);

  // Ping latencies for sources
  const refreshLatencies = useCallback(async () => {
    if (!sources || sources.length === 0) return;
    setIsPingLoading(true);

    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const response = await fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: source.source,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return { source: source.source, latency: data.latency };
          }
        } catch {
          // Ignore ping error
        }
        return { source: source.source, latency: undefined };
      })
    );

    const newLatencies: Record<string, number> = {};
    results.forEach(({ source, latency }) => {
      if (latency !== undefined) {
        newLatencies[source] = latency;
      }
    });

    setLatencies(newLatencies);
    setIsPingLoading(false);
  }, [sources]);

  // Sort sources by latency
  const sortedSources = useMemo(() => {
    if (!sources) return [];
    return [...sources].sort((a, b) => {
      const latA = latencies[a.source] ?? a.latency ?? Infinity;
      const latB = latencies[b.source] ?? b.latency ?? Infinity;
      return latA - latB;
    });
  }, [sources, latencies]);

  // Memoized display episodes - reversed if toggle is on
  const displayEpisodes = useMemo(() => {
    if (!episodes) return null;
    return isReversed ? [...episodes].reverse() : episodes;
  }, [episodes, isReversed]);

  // Map display index to original index
  const getOriginalIndex = useCallback((displayIndex: number) => {
    if (!episodes || !isReversed) return displayIndex;
    return episodes.length - 1 - displayIndex;
  }, [episodes, isReversed]);

  // Map original index to display index (for highlighting current episode)
  const getDisplayIndex = useCallback((originalIndex: number) => {
    if (!episodes || !isReversed) return originalIndex;
    return episodes.length - 1 - originalIndex;
  }, [episodes, isReversed]);

  // Calculate default active page based on currentEpisode
  const getPageForEpisodeIndex = useCallback((displayIdx: number) => {
    return Math.floor(Math.max(0, displayIdx) / PAGE_SIZE);
  }, []);

  const currentDisplayIdx = getDisplayIndex(currentEpisode);
  const [activePage, setActivePage] = useState(() => getPageForEpisodeIndex(currentDisplayIdx));

  // Sync active page if currentEpisode changes or episodes list updates
  useEffect(() => {
    setActivePage(getPageForEpisodeIndex(currentDisplayIdx));
  }, [currentDisplayIdx, getPageForEpisodeIndex]);

  const totalEpisodesCount = displayEpisodes?.length || 0;
  const isPaginated = totalEpisodesCount > PAGE_SIZE;

  // Compute page ranges for pagination tabs
  const pageRanges = useMemo(() => {
    if (!isPaginated) return [];
    const ranges = [];
    for (let i = 0; i < totalEpisodesCount; i += PAGE_SIZE) {
      const start = i + 1;
      const end = Math.min(i + PAGE_SIZE, totalEpisodesCount);
      ranges.push({
        pageIndex: Math.floor(i / PAGE_SIZE),
        start,
        end,
        label: `${start}-${end}`,
      });
    }
    return ranges;
  }, [totalEpisodesCount, isPaginated]);

  // Filter episodes for current active page tab
  const pageEpisodes = useMemo(() => {
    if (!displayEpisodes) return [];
    if (!isPaginated) return displayEpisodes;
    const start = activePage * PAGE_SIZE;
    return displayEpisodes.slice(start, start + PAGE_SIZE);
  }, [displayEpisodes, isPaginated, activePage]);

  // Keyboard navigation for episodes
  useKeyboardNavigation({
    enabled: activeTab === 'episodes',
    containerRef: listRef,
    currentIndex: getDisplayIndex(currentEpisode),
    itemCount: episodes?.length || 0,
    orientation: 'vertical',
    onNavigate: useCallback((index: number) => {
      buttonRefs.current[index]?.focus();
      buttonRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }, []),
    onSelect: useCallback((displayIndex: number) => {
      if (episodes) {
        const originalIndex = getOriginalIndex(displayIndex);
        if (episodes[originalIndex]) {
          onEpisodeClick(episodes[originalIndex], originalIndex);
        }
      }
    }, [episodes, onEpisodeClick, getOriginalIndex]),
  });

  const showReverseToggle = episodes && episodes.length > 1;
  const hasMultipleSources = sources && sources.length > 1;

  return (
    <Card hover={false}>
      {/* Header: Tab Switcher ("选集" vs "播放源") and Actions */}
      <div className="flex items-center justify-between mb-4 border-b border-[var(--glass-border)] pb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Tab 1: 选集 */}
          <button
            onClick={() => setActiveTab('episodes')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xl)] text-sm sm:text-base font-bold transition-all cursor-pointer
              ${activeTab === 'episodes'
                ? 'bg-[var(--accent-color)] text-white shadow-sm'
                : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--glass-hover)]'
              }
            `}
          >
            <Icons.List size={18} />
            <span>选集</span>
            {episodes && (
              <Badge
                variant={activeTab === 'episodes' ? 'secondary' : 'primary'}
                className={`text-xs px-1.5 py-0 ${activeTab === 'episodes' ? 'bg-white/20 text-white border-none' : ''}`}
              >
                {episodes.length}
              </Badge>
            )}
          </button>

          {/* Tab 2: 播放源 */}
          {hasMultipleSources && (
            <button
              onClick={() => setActiveTab('sources')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xl)] text-sm sm:text-base font-bold transition-all cursor-pointer
                ${activeTab === 'sources'
                  ? 'bg-[var(--accent-color)] text-white shadow-sm'
                  : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--glass-hover)]'
                }
              `}
            >
              <Icons.Layers size={18} />
              <span>播放源</span>
              <Badge
                variant={activeTab === 'sources' ? 'secondary' : 'primary'}
                className={`text-xs px-1.5 py-0 ${activeTab === 'sources' ? 'bg-white/20 text-white border-none' : ''}`}
              >
                {sources.length}
              </Badge>
            </button>
          )}
        </div>

        {/* Header Right Action Button */}
        {activeTab === 'episodes' && showReverseToggle && (
          <button
            onClick={() => onToggleReverse?.(!isReversed)}
            className={`
              p-1.5 rounded-[var(--radius-xl)] transition-all duration-200 cursor-pointer
              ${isReversed
                ? 'bg-[var(--accent-color)] text-white'
                : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)]'
              }
            `}
            aria-label={isReversed ? '恢复正序' : '倒序排列'}
            title={isReversed ? '恢复正序' : '倒序排列'}
          >
            <Icons.ArrowUpDown size={16} />
          </button>
        )}

        {activeTab === 'sources' && (
          <button
            onClick={refreshLatencies}
            disabled={isPingLoading}
            className="p-1.5 rounded-[var(--radius-xl)] transition-all duration-200 cursor-pointer bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] disabled:opacity-50"
            aria-label="刷新延迟"
            title="刷新延迟"
          >
            <Icons.RefreshCw size={16} className={isPingLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Tab Body 1: Episodes Content */}
      {activeTab === 'episodes' && (
        <>
          {/* Episode Group Pagination Range Tabs with wheel & drag scroll */}
          {isPaginated && pageRanges.length > 0 && (
            <div
              ref={rangeBarRef}
              onWheel={handleRangeWheel}
              onMouseDown={handleRangeMouseDown}
              onMouseMove={handleRangeMouseMove}
              onMouseUp={handleRangeMouseUpOrLeave}
              onMouseLeave={handleRangeMouseUpOrLeave}
              className={`flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 mb-3 scrollbar-none border-b border-[var(--glass-border)]/50 select-none ${
                isDraggingRange ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {pageRanges.map((range) => {
                const isActiveRange = activePage === range.pageIndex;
                return (
                  <button
                    key={range.pageIndex}
                    onClick={(e) => {
                      if (hasDraggedRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      setActivePage(range.pageIndex);
                    }}
                    className={`
                      px-2.5 py-1.5 text-xs font-medium rounded-[var(--radius-xl)] transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]
                      ${isActiveRange
                        ? 'bg-[var(--accent-color)] text-white shadow-sm font-bold'
                        : 'bg-[var(--glass-bg)] text-[var(--text-color-secondary)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)]'
                      }
                    `}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Episode Grid Container (5-Column Grid with Pure Padded Numbers) */}
          <div
            ref={listRef}
            className="max-h-[420px] sm:max-h-[550px] overflow-y-auto pr-1"
            role="radiogroup"
            aria-label="剧集选择"
          >
            {pageEpisodes && pageEpisodes.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {pageEpisodes.map((episode, pageIdx) => {
                  const displayIndex = isPaginated ? activePage * PAGE_SIZE + pageIdx : pageIdx;
                  const originalIndex = getOriginalIndex(displayIndex);
                  const isCurrentEpisode = currentEpisode === originalIndex;
                  const epName = formatEpisodeDisplay(episode.name, originalIndex, episodes?.length || 0);
                  const fullTitle = episode.name || `第 ${originalIndex + 1} 集`;

                  return (
                    <button
                      key={originalIndex}
                      ref={(el) => { buttonRefs.current[displayIndex] = el; }}
                      onClick={() => onEpisodeClick(episode, originalIndex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEpisodeClick(episode, originalIndex);
                        }
                      }}
                      tabIndex={0}
                      role="radio"
                      aria-checked={isCurrentEpisode}
                      aria-current={isCurrentEpisode ? 'true' : undefined}
                      aria-label={`${fullTitle}${isCurrentEpisode ? '，当前播放' : ''}`}
                      title={fullTitle}
                      className={`
                        px-1 py-2 rounded-[var(--radius-xl)] text-center transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden
                        ${isCurrentEpisode
                          ? 'bg-[var(--accent-color)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-color)_45%,transparent)] font-bold scale-[1.02]'
                          : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--text-color)] border border-[var(--glass-border)] hover:border-[var(--accent-color)]/40'
                        }
                        focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]
                      `}
                    >
                      <span className="truncate text-xs font-medium w-full text-center tracking-tight">
                        {epName}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <Icons.Inbox size={48} className="text-[var(--text-color-secondary)] mx-auto mb-2" />
                <p>暂无剧集信息</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab Body 2: Merged Sources List */}
      {activeTab === 'sources' && sources && (
        <div className="space-y-2 max-h-[420px] sm:max-h-[550px] overflow-y-auto pr-1">
          {sortedSources.map((s, index) => {
            const isCurrent = String(s.id) === String(currentSourceId) || s.source === String(currentSourceId);
            const latency = latencies[s.source] ?? s.latency;
            const srcName = s.sourceName || s.name || s.source;

            return (
              <button
                key={`${s.source}-${index}`}
                onClick={() => !isCurrent && onSourceChange?.(s)}
                className={`
                  w-full p-3 rounded-[var(--radius-xl)] text-left transition-all duration-200
                  flex items-center gap-3
                  ${isCurrent
                    ? 'bg-[var(--accent-color)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-color)_50%,transparent)] font-bold'
                    : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--text-color)] border border-[var(--glass-border)] cursor-pointer'
                  }
                `}
                aria-current={isCurrent ? 'true' : undefined}
              >
                {/* Thumbnail with fallback placeholder */}
                <SourceThumbnail pic={s.pic} alt={srcName} />

                {/* Source Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base truncate">
                    {srcName}
                  </div>
                  {latency !== undefined && (
                    <div className="mt-1">
                      <LatencyBadge latency={latency} />
                    </div>
                  )}
                </div>

                {/* Current playing indicator */}
                {isCurrent && (
                  <Badge variant="secondary" className="px-2 py-0.5 text-xs bg-white/20 text-white border-none">
                    当前播放
                  </Badge>
                )}

                {/* Rank badge for top 3 */}
                {!isCurrent && index < 3 && (
                  <Badge
                    variant="secondary"
                    className={`flex-shrink-0 ${
                      index === 0
                        ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500'
                        : index === 1
                        ? 'bg-gray-400/20 text-gray-600 border-gray-400'
                        : 'bg-orange-400/20 text-orange-600 border-orange-400'
                    }`}
                  >
                    #{index + 1}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
