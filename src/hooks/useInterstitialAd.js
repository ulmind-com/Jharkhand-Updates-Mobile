/**
 * useInterstitialAd — Interstitial Ad Hook
 * Shows full-screen ad on article open, screen transitions etc.
 * Frequency: Every 2 minutes (max revenue without being too annoying)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../config/admob';

// Show interstitial every 2 minutes (120 seconds) — aggressive but not spammy
const MIN_INTERVAL_MS = 2 * 60 * 1000;

// Track globally so it works across screens
let _lastShownAt = 0;

export default function useInterstitialAd() {
    const [isLoaded, setIsLoaded] = useState(false);
    const interstitialRef = useRef(null);

    if (Platform.OS === 'web') {
        return { showInterstitial: () => {}, isAdLoaded: false };
    }

    const loadAd = useCallback(() => {
        try {
            const ad = InterstitialAd.createForAdRequest(AdUnitIds.interstitial, {
                requestNonPersonalizedAdsOnly: false,
                keywords: ['jharkhand', 'bihar', 'news', 'india', 'jobs', 'events'],
            });

            const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
                setIsLoaded(true);
            });

            const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
                setIsLoaded(false);
                // Reload immediately after close for next time
                setTimeout(loadAd, 500);
            });

            const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
                console.log('[AdMob] Interstitial error:', error?.message);
                setIsLoaded(false);
                // Retry after 15 seconds
                setTimeout(loadAd, 15000);
            });

            ad.load();
            interstitialRef.current = { ad, unsubLoaded, unsubClosed, unsubError };
        } catch (e) {
            console.log('[AdMob] Interstitial init error:', e);
        }
    }, []);

    useEffect(() => {
        loadAd();
        return () => {
            const ref = interstitialRef.current;
            if (ref) {
                ref.unsubLoaded?.();
                ref.unsubClosed?.();
                ref.unsubError?.();
            }
        };
    }, [loadAd]);

    const showInterstitial = useCallback(() => {
        const now = Date.now();
        if (now - _lastShownAt < MIN_INTERVAL_MS) {
            return; // Too soon
        }
        if (isLoaded && interstitialRef.current?.ad) {
            try {
                interstitialRef.current.ad.show();
                _lastShownAt = now;
            } catch (e) {
                console.log('[AdMob] Failed to show interstitial:', e);
            }
        }
    }, [isLoaded]);

    return { showInterstitial, isAdLoaded: isLoaded };
}
