import { useState, FormEvent, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';
import { SearchHistoryDropdown } from '@/components/search/SearchHistoryDropdown';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';
import { useSearchBoxHandlers } from './hooks/useSearchBoxHandlers';

interface SearchBoxProps {
    onSearch: (query: string) => void;
    onClear?: () => void;
    initialQuery?: string;
    placeholder?: string;
}

export function SearchBox({ onSearch, onClear, initialQuery = '', placeholder = '搜索电影、电视剧、综艺...' }: SearchBoxProps) {
    const [query, setQuery] = useState(initialQuery);
    const inputRef = useRef<HTMLInputElement>(null);

    // Search history hook
    const {
        searchHistory,
        isDropdownOpen,
        highlightedIndex,
        showDropdown,
        hideDropdown,
        addSearch,
        removeSearch,
        clearAll,
        selectHistoryItem,
        navigateDropdown,
        resetHighlight,
    } = useSearchHistory((selectedQuery) => {
        setQuery(selectedQuery);
        onSearch(selectedQuery);
        // Blur the input after selecting from history
        inputRef.current?.blur();
    });

    // Update query when initialQuery changes
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const {
        handleSubmit,
        handleClear,
        handleInputFocus,
        handleInputBlur,
        handleKeyDown,
    } = useSearchBoxHandlers({
        query,
        setQuery,
        onSearch,
        onClear,
        inputRef,
        isDropdownOpen,
        highlightedIndex,
        searchHistory,
        addSearch,
        hideDropdown,
        showDropdown,
        resetHighlight,
        selectHistoryItem,
        navigateDropdown,
    });

    return (
        <form onSubmit={handleSubmit} className="relative group w-full" style={{ isolation: 'isolate' }}>
            <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="h-8 sm:h-9 !py-0 px-3.5 sm:px-4 text-xs sm:text-sm pr-14 sm:pr-16 truncate rounded-full bg-[color-mix(in_srgb,var(--glass-bg)_70%,transparent)]"
                aria-label="搜索视频内容"
                aria-expanded={isDropdownOpen}
                aria-controls="search-history-dropdown"
                aria-autocomplete="list"
            />

            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 sm:p-1.5 text-[var(--text-color-secondary)] hover:text-[var(--text-color)] transition-colors touch-manipulation cursor-pointer"
                        aria-label="清除搜索"
                    >
                        <Icons.X size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!query.trim()}
                    className="p-1 sm:p-1.5 text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] disabled:opacity-30 disabled:hover:text-[var(--text-color-secondary)] transition-colors touch-manipulation cursor-pointer flex items-center justify-center"
                    aria-label="搜索"
                >
                    <Icons.Search size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
            </div>

            {/* Search History Dropdown */}
            <SearchHistoryDropdown
                isOpen={isDropdownOpen}
                searchHistory={searchHistory}
                highlightedIndex={highlightedIndex}
                triggerRef={inputRef}
                onSelectItem={selectHistoryItem}
                onRemoveItem={removeSearch}
                onClearAll={clearAll}
            />
        </form>
    );
}
