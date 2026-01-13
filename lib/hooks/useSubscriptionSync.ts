import { useEffect, useRef } from 'react';
import { settingsStore } from '@/lib/store/settings-store';
import { fetchSourcesFromUrl, mergeSources } from '@/lib/utils/source-import-utils';
import type { SourceSubscription } from '@/lib/types';

// Minimum time between syncs for the same subscription (5 minutes)
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

export function useSubscriptionSync() {
    // Track if we've already synced during this component lifecycle
    const hasSyncedRef = useRef(false);
    // Track if sync is currently in progress to avoid concurrent syncs
    const isSyncingRef = useRef(false);

    // Effect to run sync only once on mount
    useEffect(() => {
        // Prevent multiple syncs if this effect runs multiple times (React StrictMode)
        if (hasSyncedRef.current || isSyncingRef.current) return;

        const sync = async () => {
            // Double-check to prevent race conditions
            if (hasSyncedRef.current || isSyncingRef.current) return;

            isSyncingRef.current = true;

            try {
                // Read subscriptions directly from store (not via state to avoid re-renders)
                const settings = settingsStore.getSettings();
                const activeSubscriptions = settings.subscriptions.filter((s: SourceSubscription) => s.autoRefresh !== false);

                if (activeSubscriptions.length === 0) {
                    hasSyncedRef.current = true;
                    return;
                }

                let anyChanged = false;
                let currentSources = [...settings.sources];
                let currentPremiumSources = [...settings.premiumSources];
                let updatedSubscriptions = [...settings.subscriptions];
                const now = Date.now();

                for (let i = 0; i < activeSubscriptions.length; i++) {
                    const sub = activeSubscriptions[i];

                    // Check if we synced this recently (within cooldown period) to avoid spamming
                    if (sub.lastUpdated && now - sub.lastUpdated < SYNC_COOLDOWN_MS) {
                        continue;
                    }

                    try {
                        const result = await fetchSourcesFromUrl(sub.url);

                        if (result.normalSources.length > 0) {
                            currentSources = mergeSources(currentSources, result.normalSources);
                            anyChanged = true;
                        }

                        if (result.premiumSources.length > 0) {
                            currentPremiumSources = mergeSources(currentPremiumSources, result.premiumSources);
                            anyChanged = true;
                        }

                        // Update timestamp
                        const subIdx = updatedSubscriptions.findIndex(s => s.id === sub.id);
                        if (subIdx !== -1) {
                            updatedSubscriptions[subIdx] = {
                                ...updatedSubscriptions[subIdx],
                                lastUpdated: now
                            };
                            anyChanged = true; // Mark changed to save the updated timestamp
                        }
                    } catch (e) {
                        console.error(`Failed to sync subscription: ${sub.name}`, e);
                    }
                }

                if (anyChanged) {
                    settingsStore.saveSettings({
                        ...settings,
                        sources: currentSources,
                        premiumSources: currentPremiumSources,
                        subscriptions: updatedSubscriptions
                    });
                }

                hasSyncedRef.current = true;
            } finally {
                isSyncingRef.current = false;
            }
        };

        // Small delay to ensure settings are fully loaded
        const timeoutId = setTimeout(sync, 1000);
        return () => clearTimeout(timeoutId);
    }, []); // Empty dependency array - only run once on mount
}
