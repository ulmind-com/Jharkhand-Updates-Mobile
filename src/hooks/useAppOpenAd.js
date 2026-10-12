/**
 * useAppOpenAd — Shows a full-screen ad when app opens / comes to foreground
 * This is the HIGHEST revenue ad type — shows every time user opens app
 * Frequency: Every 3 minutes gap between shows
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { AppOpenAd, AdEventType } from 'react-native-google-mobile-ads';
import { AdUnitIds } from '../config/admob';

// Minimum gap between App Open ads (3 minutes)
const MIN_INTERVAL_MS = 3 * 60 * 1000;

let _lastAppOpenAt = 0;
let _appOpenAd = null;
let _isLoaded = false;

function loadAppOpenAd() {
    if (Platform.OS === 'web') return;

    try {
        const ad = AppOpenAd.createForAdRequest(AdUnitIds.appOpen, {
            requestNonPersonalizedAdsOnly: false,
            keywords: ['jharkhand', 'bihar', 'news', 'india'],
        });

        ad.addAdEventListener(AdEventType.LOADED, () => {
            _isLoaded = true;
            _appOpenAd = ad;
        });

        ad.addAdEventListener(AdEventType.CLOSED, () => {
            _isLoaded = false;
            _appOpenAd = null;
            // Reload for next time
            setTimeout(loadAppOpenAd, 1000);
        });

        ad.addAdEventListener(AdEventType.ERROR, (error) => {
            console.log('[AdMob] App Open error:', error?.message);
            _isLoaded = false;
            // Retry after 30 seconds
            setTimeout(loadAppOpenAd, 30000);
        });

        ad.load();
    } catch (e) {
        console.log('[AdMob] App Open init error:', e);
    }
}

function showAppOpenAd() {
    const now = Date.now();
    if (now - _lastAppOpenAt < MIN_INTERVAL_MS) return;

    if (_isLoaded && _appOpenAd) {
        try {
            _appOpenAd.show();
            _lastAppOpenAt = now;
        } catch (e) {
            console.log('[AdMob] Failed to show app open ad:', e);
        }
    }
}

export default function useAppOpenAd() {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        if (Platform.OS === 'web') return;

        // Load ad on mount
        loadAppOpenAd();

        // Show ad when app comes to foreground
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App came to foreground — show ad!
                showAppOpenAd();
            }
            appState.current = nextAppState;
        });

        // Also show once after initial load (with delay so app loads first)
        const timer = setTimeout(() => {
            showAppOpenAd();
        }, 3000);

        return () => {
            subscription?.remove();
            clearTimeout(timer);
        };
    }, []);
}
