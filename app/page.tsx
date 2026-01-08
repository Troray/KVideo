'use client';

import { Suspense } from 'react';
import { SearchForm } from '@/components/search/SearchForm';
import { NoResults } from '@/components/search/NoResults';
import { PopularFeatures } from '@/components/home/PopularFeatures';
import { WatchHistorySidebar } from '@/components/history/WatchHistorySidebar';
import { FavoritesSidebar } from '@/components/favorites/FavoritesSidebar';
import { Navbar } from '@/components/layout/Navbar';
import { SearchResults } from '@/components/home/SearchResults';
import { useHomePage } from '@/lib/hooks/useHomePage';

function HomePage() {
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
    handleRetry,
    getSearchStats,
  } = useHomePage();

  return (
    <div className="min-h-screen">
      {/* Glass Navbar */}
      <Navbar onReset={handleReset} />

      {/* Search Form - Separate from navbar */}
      <div className="max-w-7xl mx-auto px-4 mt-6 mb-8 relative" style={{
        transform: 'translate3d(0, 0, 0)',
        zIndex: 1000
      }}>
        <SearchForm
          onSearch={handleSearch}
          onClear={handleReset}
          isLoading={loading}
          initialQuery={query}
          currentSource=""
          checkedSources={completedSources}
          totalSources={totalSources}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Results Section */}
        {(results.length >= 1 || (!loading && results.length > 0)) && (
          <SearchResults
            results={results}
            availableSources={availableSources}
            loading={loading}
          />
        )}

        {/* Popular Features - Homepage */}
        {!loading && !hasSearched && <PopularFeatures onSearch={handleSearch} />}

        {/* No Results */}
        {!loading && hasSearched && results.length === 0 && (
          <NoResults
            onReset={handleReset}
            onRetry={handleRetry}
            searchStats={getSearchStats()}
          />
        )}
      </main>

      {/* Favorites Sidebar - Left */}
      <FavoritesSidebar />

      {/* Watch History Sidebar - Right */}
      <WatchHistorySidebar />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--accent-color)] border-t-transparent"></div>
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}
