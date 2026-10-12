/**
 * AdBannerCard — Professional Google AdMob Banner Component
 *
 * Features:
 * - Smooth fade-in animation when ad loads
 * - Graceful failure (hides itself on error — no ugly empty space)
 * - "Sponsored" label for transparency
 * - Respects dark/light theme
 * - Platform-safe (renders nothing on web)
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { ThemeContext } from '../context/ThemeContext';
import { AdUnitIds } from '../config/admob';

export default function AdBannerCard({ size = 'BANNER', style }) {
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const [adLoaded, setAdLoaded] = useState(false);
    const [adFailed, setAdFailed] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Don't render on web platform
    if (Platform.OS === 'web') return null;

    // Don't render if ad failed to load
    if (adFailed) return null;

    const adUnitId = AdUnitIds.banner;

    // Choose ad size — bigger ads = more revenue
    const adSize = size === 'LARGE' ? BannerAdSize.MEDIUM_RECTANGLE
        : size === 'FULL' ? BannerAdSize.FULL_BANNER
        : size === 'LEADERBOARD' ? BannerAdSize.LEADERBOARD
        : BannerAdSize.BANNER;

    const handleAdLoaded = () => {
        setAdLoaded(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    };

    const handleAdFailed = (error) => {
        console.log('[AdMob] Banner failed:', error?.code);
        setAdFailed(true);
    };

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    opacity: fadeAnim,
                    backgroundColor: isDarkMode ? colors.surfaceDeeper || '#1a1a1a' : '#f8f9fa',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                },
                style,
            ]}
        >
            {adLoaded && (
                <View style={styles.sponsoredRow}>
                    <View style={[styles.sponsoredDot, { backgroundColor: colors.primary || '#059669' }]} />
                    <Text style={[styles.sponsoredLabel, { color: colors.textDim || '#9ca3af' }]}>
                        Sponsored
                    </Text>
                </View>
            )}

            <BannerAd
                unitId={adUnitId}
                size={adSize}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: false,
                    keywords: [
                        'jharkhand', 'bihar', 'news', 'local news',
                        'india', 'hindi news', 'regional news',
                        'jobs', 'events', 'property', 'real estate',
                    ],
                }}
                onAdLoaded={handleAdLoaded}
                onAdFailedToLoad={handleAdFailed}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        marginVertical: 8,
        marginHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        paddingTop: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    sponsoredRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingBottom: 2,
        gap: 4,
    },
    sponsoredDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        opacity: 0.7,
    },
    sponsoredLabel: {
        fontSize: 10,
        fontFamily: 'Outfit_400Regular',
        letterSpacing: 0.5,
        opacity: 0.7,
    },
});
