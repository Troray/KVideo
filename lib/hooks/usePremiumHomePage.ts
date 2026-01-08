import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearchCache } from '@/lib/hooks/useSearchCache';
import { useParallelSearch } from '@/lib/hooks/useParallelSearch';
import { settingsStore } from '@/lib/store/settings-store';

export function usePremiumHomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loadFromCache, saveToCache } = useSearchCache();
    const hasLoadedCache = useRef(false);

    // 搜索状态引用（去掉重试相关）
    const isSearchInProgress = useRef(false);

    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [currentSortBy, setCurrentSortBy] = useState('default');

    // Get premium sources from settings store (supports user customization)
    // 使用状态来响应 settingsStore 的变化
    const [enabledPremiumSources, setEnabledPremiumSources] = useState<any[]>([]);

    // 订阅 settingsStore 变化
    useEffect(() => {
        const updateSources = () => {
            const settings = settingsStore.getSettings();
            setEnabledPremiumSources(settings.premiumSources.filter(s => s.enabled));
        };

        // 初始加载
        updateSources();

        // 订阅变化
        const unsubscribe = settingsStore.subscribe(updateSources);
        return () => unsubscribe();
    }, []);

    const onUrlUpdate = useCallback((q: string) => {
        router.replace(`/premium?q=${encodeURIComponent(q)}`, { scroll: false });
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

    // Load sort preference on mount and subscribe to changes
    // 这个 useEffect 处理设置变化和自动重试逻辑
    useEffect(() => {
        const updateSettings = () => {
            const settings = settingsStore.getSettings();

            // Update sort preference
            if (settings.sortBy !== currentSortBy) {
                setCurrentSortBy(settings.sortBy);
            }

            // 检查是否需要重新触发搜索（当源加载完成后）
            // 但只执行一次，不进行重试
            const enabledSources = settings.premiumSources.filter(s => s.enabled);
            const hasSources = enabledSources.length > 0;

            // Re-sort results when sort preference changes
            if (hasSearched && results.length > 0 && applySorting) {
                applySorting(settings.sortBy as any);
            }

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
    }, [query, hasSearched, loading, performSearch, currentSortBy, results.length, applySorting]);

    // Load cached results on mount
    useEffect(() => {
        if (hasLoadedCache.current) return;
        hasLoadedCache.current = true;

        const urlQuery = searchParams.get('q');
        // Note: We might want to separate cache for premium mode, but for now sharing or not using cache might be safer.
        // However, useSearchCache uses localStorage which is shared. 
        // If we want to avoid leaking premium searches to normal history, we might want to disable cache or use a different key.
        // For simplicity and "hidden" nature, maybe we don't load cache from normal mode?
        // But the user asked for "same as original page".

        if (urlQuery) {
            setQuery(urlQuery);
            handleSearch(urlQuery);
        }
    }, [searchParams]);

    const handleSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        // 重置搜索状态
        isSearchInProgress.current = false;

        setQuery(searchQuery);
        setHasSearched(true);
        // Use enabled premium sources from settings
        performSearch(searchQuery, enabledPremiumSources, currentSortBy as any);
    };

    const handleReset = () => {
        // 重置搜索状态
        isSearchInProgress.current = false;

        setHasSearched(false);
        setQuery('');
        resetSearch();
        router.replace('/premium', { scroll: false });
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
                const enabledSources = settings.premiumSources.filter(s => s.enabled);
                if (enabledSources.length > 0) {
                    performSearch(query, enabledSources, settings.sortBy);
                    setHasSearched(true);
                }
            }, 100);
        }
    }, [query, resetSearch, performSearch]);

    // 获取搜索统计信息（与 useHomePage.ts 保持一致）
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
