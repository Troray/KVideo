import { useRef, useCallback } from 'react';
import { SOURCE_IDS } from '@/lib/utils/source-names';
import { sortVideos } from '@/lib/utils/sort';
import { binaryInsertVideos } from '@/lib/utils/sorted-insert';
import { processSearchStream } from '@/lib/utils/search-stream';
import type { SortOption } from '@/lib/store/settings-store';
import { settingsStore } from '@/lib/store/settings-store';
import type { Video } from '@/lib/types';
import { useSearchState } from './useSearchState';

type SearchState = ReturnType<typeof useSearchState>;

interface UseSearchActionProps {
    state: SearchState;
    onCacheUpdate: (query: string, results: any[], sources: any[]) => void;
    onUrlUpdate: (query: string) => void;
}

export function useSearchAction({ state, onCacheUpdate, onUrlUpdate }: UseSearchActionProps) {
    const {
        setLoading,
        setResults,
        setAvailableSources,
        setCompletedSources,
        setTotalSources,
        setTotalVideosFound,
        startSearch,
    } = state;

    const abortControllerRef = useRef<AbortController | null>(null);

    const performSearch = useCallback(async (searchQuery: string, sources: any[] = [], sortBy: SortOption = 'default') => {
        if (!searchQuery.trim()) return;

        // Sources must be provided - no fallback to prevent group mixing
        if (!sources || sources.length === 0) {
            console.error('performSearch called without sources. Sources must be filtered by group before calling.');
            return;
        }

        const targetSources = sources;

        // Abort any ongoing search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Reset state
        startSearch(searchQuery.trim());

        // Update URL
        onUrlUpdate(searchQuery);

        try {
            const response = await fetch('/api/search-parallel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, sources: targetSources }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error('Search failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            const sourcesMap = new Map<string, { count: number; name: string }>();

            await processSearchStream({
                reader,
                currentQuery: searchQuery.trim(),
                onStart: (total) => setTotalSources(total),
                onVideos: (newVideos, sourceId) => {
                    // Optimized: Insert new videos in sorted position
                    setResults((prev) => binaryInsertVideos(prev, newVideos));

                    // Update source stats
                    if (!sourcesMap.has(sourceId)) {
                        sourcesMap.set(sourceId, {
                            count: newVideos.length,
                            name: newVideos[0]?.sourceName || sourceId,
                        });
                    }
                },
                onProgress: (completed, found) => {
                    setCompletedSources(completed);
                    setTotalVideosFound(found);
                },
                onComplete: () => {
                    setLoading(false);

                    // Update available sources with correct property names
                    const sources = Array.from(sourcesMap.entries()).map(([id, info]) => ({
                        id: id,
                        name: info.name,
                        count: info.count,
                    }));
                    setAvailableSources(sources);

                    // Apply final sorting after all results are received
                    setResults((currentResults) => {
                        const sorted = sortVideos(currentResults, sortBy);

                        // Cache results
                        setTimeout(() => {
                            onCacheUpdate(searchQuery, sorted, sources);
                        }, 100);

                        return sorted;
                    });
                },
                onError: (message) => {
                    console.error('Search error:', message);
                    setLoading(false);
                },
            });

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Ignore abort errors
            } else {
                console.error('Search error:', error);
            }
            setLoading(false);
        }
    }, [startSearch, onUrlUpdate, onCacheUpdate, setTotalSources, setResults, setCompletedSources, setTotalVideosFound, setLoading, setAvailableSources]);

    const cancelSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return { performSearch, cancelSearch };
}
