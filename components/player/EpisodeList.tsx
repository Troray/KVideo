'use client';

import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
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

const PAGE_SIZE = 30;

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

  // Keyboard navigation
  useKeyboardNavigation({
    enabled: true,
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

  return (
    <Card hover={false}>
      {/* Header with Title and Reverse Toggle */}
      <h3 className="text-lg sm:text-xl font-bold text-[var(--text-color)] mb-3 flex items-center gap-2">
        <Icons.List size={20} className="sm:w-6 sm:h-6" />
        <span>选集</span>
        {episodes && (
          <Badge variant="primary">{episodes.length}</Badge>
        )}
        {/* Reverse order toggle button - only show when more than 1 episode */}
        {showReverseToggle && (
          <button
            onClick={() => onToggleReverse?.(!isReversed)}
            className={`
              ml-auto p-1.5 rounded-[var(--radius-2xl)] transition-all duration-200 cursor-pointer
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
      </h3>

      {/* Integrated Merged Source Tabs */}
      {sources && sources.length > 1 && (
        <div className="mb-4">
          <div className="text-xs text-[var(--text-color-secondary)] mb-1.5 font-medium flex items-center gap-1">
            <Icons.Globe size={13} />
            <span>切换播放源：</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {sources.map((s) => {
              const isSelected = String(s.id) === String(currentSourceId) || s.source === String(currentSourceId);
              return (
                <button
                  key={`${s.source}-${s.id}`}
                  onClick={() => onSourceChange?.(s)}
                  className={`
                    px-2.5 py-1.5 text-xs font-semibold rounded-[var(--radius-xl)] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5
                    ${isSelected
                      ? 'bg-[var(--accent-color)] text-white shadow-[0_2px_8px_rgba(var(--accent-color-rgb),0.3)] font-bold'
                      : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--text-color-secondary)] hover:text-[var(--text-color)] border border-[var(--glass-border)]'
                    }
                  `}
                >
                  <span>{s.sourceName || s.name || s.source}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Episode Group Pagination Tabs (Range Selector for 30+ episodes) */}
      {isPaginated && pageRanges.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none border-b border-[var(--glass-border)]/50">
          {pageRanges.map((range) => {
            const isActiveRange = activePage === range.pageIndex;
            return (
              <button
                key={range.pageIndex}
                onClick={() => setActivePage(range.pageIndex)}
                className={`
                  px-2.5 py-1 text-xs font-medium rounded-[var(--radius-xl)] transition-all cursor-pointer whitespace-nowrap
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

      {/* Episode Grid Container */}
      <div
        ref={listRef}
        className="max-h-[420px] sm:max-h-[550px] overflow-y-auto pr-1"
        role="radiogroup"
        aria-label="剧集选择"
      >
        {pageEpisodes && pageEpisodes.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {pageEpisodes.map((episode, pageIdx) => {
              const displayIndex = isPaginated ? activePage * PAGE_SIZE + pageIdx : pageIdx;
              const originalIndex = getOriginalIndex(displayIndex);
              const isCurrentEpisode = currentEpisode === originalIndex;
              const epName = episode.name || `第 ${originalIndex + 1} 集`;

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
                  aria-label={`${epName}${isCurrentEpisode ? '，当前播放' : ''}`}
                  title={epName}
                  className={`
                    px-2 py-2 rounded-[var(--radius-2xl)] text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 overflow-hidden
                    ${isCurrentEpisode
                      ? 'bg-[var(--accent-color)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-color)_45%,transparent)] font-bold scale-[1.02]'
                      : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--text-color)] border border-[var(--glass-border)] hover:border-[var(--accent-color)]/40'
                    }
                    focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]
                  `}
                >
                  <span className="truncate text-xs sm:text-sm font-medium">
                    {epName}
                  </span>
                  {isCurrentEpisode && (
                    <Icons.Play size={12} className="shrink-0 fill-current" />
                  )}
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
    </Card>
  );
}
