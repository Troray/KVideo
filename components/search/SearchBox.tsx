import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { SearchHistoryDropdown } from '@/components/search/SearchHistoryDropdown';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';
import { useDebouncedSearch } from '@/lib/hooks/useDebouncedSearch';

interface SearchBoxProps {
    onSearch: (query: string) => void;
    onClear?: () => void;
    initialQuery?: string;
    placeholder?: string;
    enableDebounce?: boolean;
    debounceDelay?: number;
}

export function SearchBox({
    onSearch,
    onClear,
    initialQuery = '',
    placeholder = '搜索电影、电视剧、综艺...',
    enableDebounce = true,
    debounceDelay = 600
}: SearchBoxProps) {
    const [query, setQuery] = useState(initialQuery);
    const inputRef = useRef<HTMLInputElement>(null);
    const isTypingRef = useRef(false);

    // Debounced search hook
    const { debouncedSearch, immediateSearch, clearTimer } = useDebouncedSearch(
        (searchQuery) => {
            if (searchQuery.trim()) {
                onSearch(searchQuery);
            }
        },
        {
            delay: debounceDelay,
            minLength: 1,
            enabled: enableDebounce
        }
    );

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
        // Use immediate search for history selection
        immediateSearch(selectedQuery);
        // Blur the input after selecting from history
        inputRef.current?.blur();
    });

    // Update query when initialQuery changes
    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    // Handle query changes with debouncing
    const handleQueryChange = (newQuery: string) => {
        setQuery(newQuery);
        isTypingRef.current = true;

        if (enableDebounce) {
            // Use debounced search for typing
            debouncedSearch(newQuery);
        }
    };

    // Handle input focus - show dropdown
    const handleInputFocus = () => {
        showDropdown();
    };

    // Handle input blur - hide dropdown
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && relatedTarget.closest('.search-history-dropdown')) {
            return;
        }
        hideDropdown();

        // If user stops typing and there's a pending search, execute it immediately
        if (isTypingRef.current && query.trim()) {
            isTypingRef.current = false;
            if (!enableDebounce) {
                // If debounce is disabled, search immediately on blur
                immediateSearch(query);
            }
        }
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            addSearch(query.trim());
            // Use immediate search for form submission
            immediateSearch(query);
            hideDropdown();
            inputRef.current?.blur();
            isTypingRef.current = false;
        }
    };

    // Handle clear
    const handleClear = () => {
        setQuery('');
        clearTimer();
        if (onClear) {
            onClear();
        }
        resetHighlight();
        isTypingRef.current = false;
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                navigateDropdown('down');
                break;
            case 'ArrowUp':
                e.preventDefault();
                navigateDropdown('up');
                break;
            case 'Enter':
                if (highlightedIndex >= 0 && searchHistory[highlightedIndex]) {
                    e.preventDefault();
                    selectHistoryItem(searchHistory[highlightedIndex].query);
                    isTypingRef.current = false;
                }
                break;
            case 'Escape':
                hideDropdown();
                inputRef.current?.blur();
                break;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative group" style={{ isolation: 'isolate' }}>
            <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="text-base sm:text-lg pr-28 sm:pr-36 md:pr-44 truncate"
                aria-label="搜索视频内容"
                aria-expanded={isDropdownOpen}
                aria-controls="search-history-dropdown"
                aria-autocomplete="list"
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-2 text-[var(--text-color)] opacity-70 hover:opacity-100 transition-opacity touch-manipulation cursor-pointer"
                        aria-label="清除搜索"
                    >
                        <Icons.X size={20} />
                    </button>
                )}
                <Button
                    type="submit"
                    disabled={!query.trim()}
                    variant="primary"
                    className="px-3 sm:px-4 md:px-6"
                >
                    <span className="flex items-center gap-2">
                        <Icons.Search size={20} />
                        <span className="hidden sm:inline">搜索</span>
                    </span>
                </Button>
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
