import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearchCache } from '@/lib/hooks/useSearchCache';
import { useParallelSearch } from '@/lib/hooks/useParallelSearch';
import { useSubscriptionSync } from '@/lib/hooks/useSubscriptionSync';
import { settingsStore } from '@/lib/store/settings-store';

export function useHomePage() {
    useSubscriptionSync();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loadFromCache, saveToCache } = useSearchCache();
    const hasLoadedCache = useRef(false);

    // 搜索状态引用（去掉重试相关）
    const isSearchInProgress = useRef(false);

    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [currentSortBy, setCurrentSortBy] = useState('default');

    const onUrlUpdate = useCallback((q: string) => {
        router.replace(`/?q=${encodeURIComponent(q)}`, { scroll: false });
    }, [router]);

    // Search stream hook
    const {
        loading,
        results,
        availableSources,
        completedSources,
        totalSources,
        performSearch,
        resetSearch,
        loadCachedResults,
        applySorting,
    } = useParallelSearch(
        saveToCache,
        onUrlUpdate
    );

    // Re-sort results when sort preference changes
    useEffect(() => {
        if (hasSearched && results.length > 0) {
            applySorting(currentSortBy as any);
        }
    }, [currentSortBy, applySorting, hasSearched, results.length]);

    // Load sort preference on mount and subscribe to changes
    useEffect(() => {
        const updateSettings = () => {
            const settings = settingsStore.getSettings();

            // Update sort preference
            if (settings.sortBy !== currentSortBy) {
                setCurrentSortBy(settings.sortBy);
            }

            // 检查是否需要重新触发搜索（当源加载完成后）
            // 但只执行一次，不进行重试
            const enabledSources = settings.sources.filter(s => s.enabled);
            const hasSources = enabledSources.length > 0;

            // 如果有查询，但还没有搜索过，且现在有可用源，则执行一次搜索
            if (query && hasSources && !hasSearched && !loading && !isSearchInProgress.current) {
                isSearchInProgress.current = true;
                performSearch(query, enabledSources, settings.sortBy)
                    .finally(() => {
                        isSearchInProgress.current = false;
                    });
                setHasSearched(true);
            }
        };

        // Initial load
        updateSettings();

        // Subscribe to changes
        const unsubscribe = settingsStore.subscribe(updateSettings);
        return () => unsubscribe();
    }, [query, hasSearched, loading, performSearch, currentSortBy]);

    // Load cached results on mount
    useEffect(() => {
        if (hasLoadedCache.current) return;
        hasLoadedCache.current = true;

        const urlQuery = searchParams.get('q');
        const cached = loadFromCache();

        if (urlQuery) {
            setQuery(urlQuery);
            if (cached && cached.query === urlQuery && cached.results.length > 0) {
                setHasSearched(true);
                loadCachedResults(cached.results, cached.availableSources);
            } else {
                handleSearch(urlQuery);
            }
        }
    }, [searchParams, loadFromCache, loadCachedResults]);

    const handleSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        // 重置搜索状态
        isSearchInProgress.current = false;

        setQuery(searchQuery);
        setHasSearched(true);
        const settings = settingsStore.getSettings();
        // Filter enabled sources
        const enabledSources = settings.sources.filter(s => s.enabled);

        if (enabledSources.length === 0) {
            // If no sources yet, we can't do much, but the subscription above will catch it
            // once sources are loaded by useSubscriptionSync
            return;
        }

        performSearch(searchQuery, enabledSources, currentSortBy as any);
    };

    const handleReset = () => {
        // 重置搜索状态
        isSearchInProgress.current = false;

        setHasSearched(false);
        setQuery('');
        resetSearch();
        router.replace('/', { scroll: false });
    };

    // 重新搜索逻辑（直接执行，不重试）
    const handleRetry = useCallback(() => {
        if (query) {
            // 重置状态但保留查询
            isSearchInProgress.current = false;
            resetSearch();

            // 延迟执行以确保状态重置完成
            setTimeout(() => {
                const settings = settingsStore.getSettings();
                const enabledSources = settings.sources.filter(s => s.enabled);
                if (enabledSources.length > 0) {
                    performSearch(query, enabledSources, settings.sortBy);
                    setHasSearched(true);
                }
            }, 100);
        }
    }, [query, resetSearch, performSearch]);

    // 获取搜索统计信息
    const getSearchStats = useCallback(() => {
        if (!hasSearched) return undefined;
        return {
            totalSources: totalSources,
            completedSources: completedSources,
            query: query
        };
    }, [hasSearched, totalSources, completedSources, query]);

    return {
        query,
        hasSearched,
        loading,
        results,
        availableSources,
        completedSources,
        totalSources,
        handleSearch,
        handleReset,
        handleRetry,
        getSearchStats,
    };
}
