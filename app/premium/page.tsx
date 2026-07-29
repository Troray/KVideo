'use client';

import { Suspense } from 'react';
import { SearchForm } from '@/components/search/SearchForm';
import { NoResults } from '@/components/search/NoResults';
import { Navbar } from '@/components/layout/Navbar';
import { SearchResults } from '@/components/home/SearchResults';
import { usePremiumHomePage } from '@/lib/hooks/usePremiumHomePage';
import { PremiumContent } from '@/components/premium/PremiumContent';
import { FavoritesSidebar } from '@/components/favorites/FavoritesSidebar';

function PremiumHomePage() {
    const {
        query,
        hasSearched,
        loading,
        results,
        availableSources,
        completedSources,
        totalSources,
        handleSearch,
        handleReset,
    } = usePremiumHomePage();

    return (
        <div className="min-h-screen bg-black">
            {/* Glass Navbar with integrated search */}
            <Navbar
                onReset={handleReset}
                isPremiumMode={true}
                onSearch={handleSearch}
                isLoading={loading}
                query={query}
                checkedSources={completedSources}
                totalSources={totalSources}
                placeholder="输入关键词开始搜索..."
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
                {/* Results Section */}
                {(results.length >= 1 || (!loading && results.length > 0)) && (
                    <SearchResults
                        results={results}
                        availableSources={availableSources}
                        loading={loading}
                        isPremium={true}
                    />
                )}

                {/* No Results */}
                {!loading && hasSearched && results.length === 0 && (
                    <NoResults onReset={handleReset} />
                )}

                {/* Premium Content - Trending and Latest */}
                {!loading && !hasSearched && (
                    <PremiumContent onSearch={handleSearch} />
                )}
            </main>

            {/* Favorites Sidebar - Left */}
            <FavoritesSidebar isPremium={true} />
        </div>
    );
}

export default function PremiumPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--accent-color)] border-t-transparent"></div>
            </div>
        }>
            <PremiumHomePage />
        </Suspense>
    );
}
