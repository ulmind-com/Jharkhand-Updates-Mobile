import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LottieView = Platform.OS !== 'web' ? require('lottie-react-native').default : null;

// ─── Indian Flag Colors ───────────────────────────────────────────────────────
const SAFFRON = '#FF9933';
const FLAG_WHITE = '#F5F5F5';
const INDIA_GREEN = '#138808';
const ASHOKA_BLUE = '#000080';

// ─── Festival Registry ────────────────────────────────────────────────────────
// Use `exactDates: ['YYYY-MM-DD', 'YYYY-MM-DD']` for specific date ranges (inclusive)
// Use `annual: { month: M, day: D, windowDays: W }` for repeating yearly events. 

const FESTIVALS = [
    {
        key: 'new_year',
        label: 'Happy New Year!', emoji: '🎊',
        annual: { month: 1, day: 1, windowDays: 2 },
        colors: ['#1e3a5f', '#0ea5e9'],
        animation: null,
    },
    {
        key: 'republic_day',
        label: 'Happy Republic Day!', emoji: '🇮🇳',
        annual: { month: 1, day: 26, windowDays: 1 },
        colors: [SAFFRON, INDIA_GREEN],
        animation: require('../../assets/animations/15aug.json'),
        flagAnimation: require('../../assets/animations/indianflag.json'),
        theme: 'india_flag',
    },
    {
        key: 'holi',
        label: 'Happy Holi!', emoji: '🎨',
        exactDates: ['2026-02-27', '2026-03-06'], // Show from today up to 6th March
        colors: ['#f472b6', '#a855f7'],
        animation: require('../../assets/animations/holi.json'),
    },
    {
        key: 'eid',
        label: 'Eid Mubarak!', emoji: '🌙',
        exactDates: ['2026-03-20', '2026-03-21'], // As per 2026: 20th to 21st March
        colors: ['#064e3b', '#10b981'],
        animation: require('../../assets/animations/eid.json'),
        flagAnimation: require('../../assets/animations/shine.json'),
        theme: 'eid',
    },
    {
        key: 'independence_day',
        label: 'Happy Independence Day!', emoji: '🇮🇳',
        annual: { month: 8, day: 15, windowDays: 1 }, // 14th-16th Aug every year
        colors: [SAFFRON, INDIA_GREEN],
        animation: require('../../assets/animations/15aug.json'),
        flagAnimation: require('../../assets/animations/indianflag.json'),
        theme: 'india_flag',
    },
    {
        key: 'durga_puja',
        label: 'Shubho Durga Puja!', emoji: '🌸',
        exactDates: ['2026-10-14', '2026-10-22'], // As per 2026: 14th to 22nd Oct
        colors: ['#7f1d1d', '#b45309'],
        animation: require('../../assets/animations/Durga-Puja.json'),
        theme: 'durga_puja',
    },
    {
        key: 'diwali',
        label: 'Happy Diwali!', emoji: '🪔',
        exactDates: ['2026-11-04', '2026-11-13'], // As per 2026: 4th to 13th Nov
        colors: ['#1a0033', '#f59e0b'],
        animation: require('../../assets/animations/Happy-Diwali.json'),
        flagAnimation: require('../../assets/animations/fireworks.json'),
        theme: 'diwali',
    },
    {
        key: 'christmas',
        label: 'Merry Christmas!', emoji: '🎄',
        annual: { month: 12, day: 25, windowDays: 2 }, // 23rd to 27th Dec every year
        colors: ['#0a192f', '#0284c7'],
        animation: require('../../assets/animations/MerryChristmas.json'),
        flagAnimation: require('../../assets/animations/Santa.json'),
        theme: 'christmas',
    },
];

function getActiveFestival() {
    const today = new Date();
    // Reset time to start of day for accurate full-day matching
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    for (const f of FESTIVALS) {
        if (f.exactDates && f.exactDates.length === 2) {
            // Match against a specific YYYY-MM-DD range
            const startDate = new Date(f.exactDates[0]); startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(f.exactDates[1]); endDate.setHours(23, 59, 59, 999);

            if (todayTime >= startDate.getTime() && todayTime <= endDate.getTime()) {
                return f;
            }
        }
        else if (f.annual) {
            // Match against an annual repeating date with a window
            const anchor = new Date(today.getFullYear(), f.annual.month - 1, f.annual.day);
            anchor.setHours(0, 0, 0, 0);

            const diffDays = Math.round((todayTime - anchor.getTime()) / (1000 * 60 * 60 * 24));

            // To support "23rd to 27th" for Christmas (25th anchor), windowDays should be 2. (-2 and +2 days)
            if (diffDays >= -f.annual.windowDays && diffDays <= f.annual.windowDays) {
                return f;
            }
        }
    }
    return null;
}

// ─── Diwali Night Sky Banner ─────────────────────────────────────────────────
function DiwaliThemeBanner({ festival, onDismiss, fadeAnim, slideAnim }) {
    // Scale entrance — native driver
    const scaleAnim = useRef(new Animated.Value(0.94)).current;
    // Two dot pulse values (opposite phase) — both native driver
    const dotPulseA = useRef(new Animated.Value(1)).current;
    const dotPulseB = useRef(new Animated.Value(1.5)).current;

    useEffect(() => {
        // Scale entrance
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();

        // Dot pulse A: 1 → 1.5 → 1
        Animated.loop(
            Animated.sequence([
                Animated.timing(dotPulseA, { toValue: 1.5, duration: 900, useNativeDriver: true }),
                Animated.timing(dotPulseA, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
        // Dot pulse B: opposite phase 1.5 → 1 → 1.5
        Animated.loop(
            Animated.sequence([
                Animated.timing(dotPulseB, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(dotPulseB, { toValue: 1.5, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        // Outer: opacity + translateY from parent (native) — NO JS-driver props here
        <Animated.View style={[
            diSt.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            {/* Inner: scale entrance (native) */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: scaleAnim }] }]}>
                <View style={diSt.nightBg} />
                <View style={diSt.glowLeft} />
                <View style={diSt.glowRight} />
                <View style={diSt.glowTop} />

                {festival.flagAnimation && LottieView && (
                    <View style={diSt.fireworksWrap} pointerEvents="none">
                        <LottieView
                            source={festival.flagAnimation}
                            autoPlay loop
                            style={diSt.fireworksLottie}
                            resizeMode="cover"
                            speed={0.95}
                        />
                    </View>
                )}

                {festival.animation && LottieView ? (
                    <View style={diSt.heroWrap} pointerEvents="none">
                        <LottieView
                            source={festival.animation}
                            autoPlay loop
                            style={diSt.heroLottie}
                            resizeMode="contain"
                            speed={0.85}
                        />
                    </View>
                ) : (
                    <View style={diSt.heroWrap}>
                        <Text style={diSt.fallback}>🪔 Happy Diwali!</Text>
                    </View>
                )}

                {/* Breathing dots */}
                <View style={diSt.dotsRow}>
                    {[...Array(9)].map((_, i) => {
                        const color = i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF6B00' : '#ff69b4';
                        const pulse = i % 2 === 0 ? dotPulseA : dotPulseB;
                        return (
                            <Animated.View key={i} style={[
                                diSt.dot,
                                { backgroundColor: color, transform: [{ scale: pulse }] },
                            ]} />
                        );
                    })}
                </View>

                <View style={diSt.bottomStrip}>
                    <Text style={diSt.subtext}>🪔  Shubh Deepawali!  —  From Jharkhand Updates  🪔</Text>
                </View>
            </Animated.View>

            {/* Dismiss — outside inner so it's always tappable */}
            <TouchableOpacity style={diSt.closeBtn} onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={diSt.closePill}>
                    <Ionicons name="close" size={13} color="#FFD700" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const diSt = StyleSheet.create({
    card: {
        marginBottom: 16, borderRadius: 20, overflow: 'hidden',
        height: 155,
        elevation: 10,
        shadowColor: '#FFD700',
        shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
        borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.25)',
    },
    nightBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0d0015',
    },
    glowLeft: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#4c0082', opacity: 0.4,
        top: -60, left: -50,
    },
    glowRight: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#7c2d00', opacity: 0.4,
        bottom: -60, right: -50,
    },
    glowTop: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#c2185b', opacity: 0.22,
        top: -30, right: 40,
    },
    // Fireworks: full card overlay
    fireworksWrap: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.9,
    },
    fireworksLottie: {
        width: '100%', height: '100%',
    },
    // Happy Diwali text: centered hero
    heroWrap: {
        position: 'absolute',
        top: 4, left: 0, right: 0,
        height: 122,
        alignItems: 'center', justifyContent: 'center',
    },
    heroLottie: {
        width: '96%', height: 128,
    },
    fallback: {
        fontSize: 18, fontFamily: 'Outfit_700Bold',
        color: '#FFD700', textAlign: 'center',
    },
    // Glowing dots
    dotsRow: {
        position: 'absolute',
        top: 8, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 10,
    },
    dot: {
        width: 7, height: 7, borderRadius: 3.5,
        shadowColor: '#FFD700', shadowOpacity: 1, shadowRadius: 6,
    },
    // Bottom gold strip
    bottomStrip: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingVertical: 6, paddingHorizontal: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,180,0,0.18)',
        borderTopWidth: 0.5, borderTopColor: 'rgba(255,215,0,0.3)',
    },
    subtext: {
        fontSize: 10, fontFamily: 'Outfit_600SemiBold',
        color: '#FFD700', letterSpacing: 0.4,
        textShadowColor: 'rgba(255,140,0,0.6)',
        textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6,
    },
    closeBtn: { position: 'absolute', top: 8, right: 8 },
    closePill: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12, width: 24, height: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
    },
});

// ─── Christmas Snow Banner (White & Blue Pro Theme) ──────────────────────────
function ChristmasThemeBanner({ festival, onDismiss, fadeAnim, slideAnim }) {
    // Scale entrance
    const scaleAnim = useRef(new Animated.Value(0.94)).current;

    // We have 15 bg + 12 fg = 27 flakes total
    // Create an individual animated value for each flake so they fall independently
    const snowDrifts = useRef([...Array(27)].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();

        // Start each flake with a random staggered delay
        snowDrifts.forEach((drift, i) => {
            const duration = 3000 + (i % 5) * 800; // Randomize duration between 3s and 6.2s
            const delay = (i * 230) % 3000;       // Staggered start times up to 3 seconds

            Animated.loop(
                Animated.timing(drift, {
                    toValue: 1,
                    duration: duration,
                    delay: delay,
                    useNativeDriver: true
                })
            ).start();
        });
    }, []);

    return (
        <Animated.View style={[
            xmasSt.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: scaleAnim }] }]}>
                {/* Winter Night Sky gradient-like bg */}
                <View style={xmasSt.bgPrimary} />
                <View style={xmasSt.glowLeft} />
                <View style={xmasSt.glowRight} />
                <View style={xmasSt.glowTop} />

                {/* Animated Snowflakes (Background) */}
                {[...Array(15)].map((_, i) => {
                    const driftY = snowDrifts[i];
                    const translateY = driftY.interpolate({ inputRange: [0, 1], outputRange: [-20, 180] });
                    const opacity = driftY.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.25 + (i % 3) * 0.2, 0.25 + (i % 3) * 0.2, 0] });

                    return (
                        <Animated.View key={`bg-${i}`} style={[
                            xmasSt.snowFlake,
                            {
                                left: `${(i * 13) % 100}%`,
                                top: 0,
                                opacity: opacity,
                                transform: [{ translateY }, { scale: 0.8 + (i % 3) * 0.3 }],
                            }
                        ]} />
                    );
                })}

                {/* Main Hero Animation (MerryChristmas.json text) */}
                {festival.animation && LottieView ? (
                    <View style={xmasSt.heroWrap} pointerEvents="none">
                        <LottieView
                            source={festival.animation}
                            autoPlay loop
                            style={xmasSt.heroLottie}
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <View style={xmasSt.heroWrap}>
                        <Text style={xmasSt.fallback}>❄️ Merry Christmas!</Text>
                    </View>
                )}

                {/* Floating center-bottom animation (Santa.json) */}
                {festival.flagAnimation && LottieView && (
                    <View style={xmasSt.santaWrap} pointerEvents="none">
                        <LottieView
                            source={festival.flagAnimation}
                            autoPlay loop
                            style={xmasSt.santaLottie}
                            resizeMode="contain"
                        />
                    </View>
                )}

                {/* Animated Snowflakes (Foreground - in front of Santa & Text) */}
                {[...Array(12)].map((_, i) => {
                    const driftY = snowDrifts[15 + i];
                    const translateY = driftY.interpolate({ inputRange: [0, 1], outputRange: [-20, 180] });
                    const opacity = driftY.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.6 + (i % 2) * 0.4, 0.6 + (i % 2) * 0.4, 0] });

                    return (
                        <Animated.View key={`fg-${i}`} style={[
                            xmasSt.snowFlake,
                            {
                                left: `${(i * 19 + 5) % 100}%`,
                                top: 0,
                                opacity: opacity,
                                transform: [{ translateY }, { scale: 1.4 + (i % 2) * 0.6 }],
                            }
                        ]} />
                    );
                })}

                {/* Bottom Strip (Frosty) */}
                <View style={xmasSt.bottomStrip}>
                    <Text style={xmasSt.subtext}>❄️  Seasons Greetings  —  From Jharkhand Updates  ❄️</Text>
                </View>
            </Animated.View>

            <TouchableOpacity style={xmasSt.closeBtn} onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={xmasSt.closePill}>
                    <Ionicons name="close" size={13} color="#0284c7" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const xmasSt = StyleSheet.create({
    card: {
        marginBottom: 16, borderRadius: 20, overflow: 'hidden',
        height: 155,
        elevation: 10,
        shadowColor: '#00f2fe', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    },
    bgPrimary: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0a192f', // Deep navy winter night
    },
    glowLeft: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#0284c7', opacity: 0.35, // Bright sky blue
        top: -80, left: -60,
    },
    glowRight: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#38bdf8', opacity: 0.25, // Lighter icy blue
        bottom: -50, right: -40,
    },
    glowTop: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: '#ffffff', opacity: 0.15, // Frosty white highlight
        top: -30, right: 30,
    },
    snowFlake: {
        position: 'absolute',
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#ffffff',
        shadowColor: '#ffffff', shadowOpacity: 1, shadowRadius: 5,
    },
    heroWrap: {
        position: 'absolute',
        top: -12, left: 0, right: 0,
        height: 70,
        alignItems: 'center', justifyContent: 'center',
    },
    heroLottie: {
        width: '100%', height: '100%',
    },
    santaWrap: {
        position: 'absolute',
        bottom: 8, left: 0, right: 0,
        height: 110,
        alignItems: 'center', justifyContent: 'center',
    },
    santaLottie: {
        width: '100%', height: '100%',
    },
    fallback: {
        fontSize: 20, fontFamily: 'Outfit_700Bold',
        color: '#ffffff', textAlign: 'center',
    },
    bottomStrip: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingVertical: 7, paddingHorizontal: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,1)',
    },
    subtext: {
        fontSize: 10, fontFamily: 'Outfit_700Bold',
        color: '#0369a1', letterSpacing: 0.4, // Deep blue text on frost
    },
    closeBtn: { position: 'absolute', top: 8, right: 8 },
    closePill: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12, width: 24, height: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(2,132,199,0.3)',
    },
});

// ─── Eid Premium Banner ────────────────────────────────────────────────────────
function EidThemeBanner({ festival, onDismiss, fadeAnim, slideAnim }) {
    // Scale entrance
    const scaleAnim = useRef(new Animated.Value(0.94)).current;
    // Star floating
    const floatY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();

        // Slow continuous floating motion for stars
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatY, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatY, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const floatTranslate1 = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
    const floatTranslate2 = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });

    return (
        <Animated.View style={[
            eidSt.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: scaleAnim }] }]}>
                {/* Deep Green Night bg */}
                <View style={eidSt.bgPrimary} />
                <View style={eidSt.glowLeft} />
                <View style={eidSt.glowRight} />

                {/* Floating Stars (Background Decor - CSS) */}
                {[...Array(6)].map((_, i) => (
                    <Animated.View key={`star-${i}`} style={[
                        eidSt.star,
                        {
                            left: `${(i * 20 + 5) % 100}%`,
                            top: `${(i * 35 + 10) % 70}%`,
                            opacity: 0.3 + (i % 3) * 0.2,
                            transform: [
                                { translateY: i % 2 === 0 ? floatTranslate1 : floatTranslate2 },
                                { scale: 0.6 + (i % 3) * 0.3 }
                            ],
                        }
                    ]} />
                ))}

                {/* Animated Shine/Star Lottie (shine.json) */}
                {festival.flagAnimation && LottieView && (
                    <View style={eidSt.shineWrap} pointerEvents="none">
                        <LottieView
                            source={festival.flagAnimation}
                            autoPlay loop
                            style={eidSt.shineLottie}
                            resizeMode="cover"
                        />
                    </View>
                )}

                {/* Main Hero Animation (eid.json) */}
                {festival.animation && LottieView ? (
                    <View style={eidSt.heroWrap} pointerEvents="none">
                        <LottieView
                            source={festival.animation}
                            autoPlay loop
                            style={eidSt.heroLottie}
                            resizeMode="contain"
                            speed={0.9}
                        />
                    </View>
                ) : (
                    <View style={eidSt.heroWrap}>
                        <Text style={eidSt.fallback}>🌙 Eid Mubarak!</Text>
                    </View>
                )}

                {/* Shimmering Gold Bottom Strip */}
                <View style={eidSt.bottomStrip}>
                    <Text style={eidSt.subtext}>✨  Eid Mubarak!  —  From Jharkhand Updates  ✨</Text>
                </View>
            </Animated.View>

            <TouchableOpacity style={eidSt.closeBtn} onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={eidSt.closePill}>
                    <Ionicons name="close" size={13} color="#FFD700" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const eidSt = StyleSheet.create({
    card: {
        marginBottom: 16, borderRadius: 20, overflow: 'hidden',
        height: 155,
        elevation: 10,
        shadowColor: '#10b981', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
        borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.35)', // Gold border
    },
    bgPrimary: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#022c22', // Very deep green
    },
    glowLeft: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#059669', opacity: 0.25, // Emerald glow
        top: -80, left: -60,
    },
    glowRight: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#fbbf24', opacity: 0.15, // Golden glow
        bottom: -50, right: -40,
    },
    star: {
        position: 'absolute',
        width: 4, height: 4, borderRadius: 2,
        backgroundColor: '#fbbf24', // Gold stars
        shadowColor: '#fbbf24', shadowOpacity: 1, shadowRadius: 6,
    },
    shineWrap: {
        position: 'absolute',
        top: -10, bottom: 28, left: -20, right: -20, // Cover the background nicely
        alignItems: 'center', justifyContent: 'center',
        opacity: 0.75, // Avoid overpowering the main eid json
    },
    shineLottie: {
        width: '100%', height: '100%',
    },
    heroWrap: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 28,
        alignItems: 'center', justifyContent: 'center',
    },
    heroLottie: {
        width: '100%', height: '100%',
    },
    fallback: {
        fontSize: 22, fontFamily: 'Outfit_700Bold',
        color: '#fbbf24', textAlign: 'center', // Gold text
    },
    bottomStrip: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingVertical: 7, paddingHorizontal: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,180,0,0.12)', // Subtle gold tint
        borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.4)',
    },
    subtext: {
        fontSize: 10, fontFamily: 'Outfit_600SemiBold',
        color: '#fef3c7', letterSpacing: 0.5, // Bright yellow/white
        textShadowColor: 'rgba(251,191,36,0.5)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    closeBtn: { position: 'absolute', top: 8, right: 8 },
    closePill: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12, width: 24, height: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)', // Gold rim
    },
});

// ─── Durga Puja Premium Banner ─────────────────────────────────────────────────
function DurgaPujaThemeBanner({ festival, onDismiss, fadeAnim, slideAnim }) {
    // Scale entrance
    const scaleAnim = useRef(new Animated.Value(0.94)).current;

    // We have 12 floating petals
    const petalDrifts = useRef([...Array(12)].map(() => new Animated.Value(0))).current;

    // Smoke/Dhoya rising effect for Agarbatti (Left & Right)
    const smokeDrifts = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();

        // Start petals
        petalDrifts.forEach((drift, i) => {
            const duration = 4000 + (i % 4) * 1000;
            const delay = (i * 300) % 4000;
            Animated.loop(Animated.timing(drift, { toValue: 1, duration, delay, useNativeDriver: true })).start();
        });

        // Start smoke/dhoya
        smokeDrifts.forEach((drift, i) => {
            const duration = 2500 + (i % 3) * 600;
            const delay = (i * 200) % 2000;
            Animated.loop(Animated.timing(drift, { toValue: 1, duration, delay, useNativeDriver: true })).start();
        });
    }, []);

    return (
        <Animated.View style={[
            pujaSt.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: scaleAnim }] }]}>
                {/* Deep Crimson/Gold background */}
                <View style={pujaSt.bgPrimary} />
                <View style={pujaSt.glowLeft} />
                <View style={pujaSt.glowRight} />

                {/* Perfect background circle/mandala matching the JSON */}
                <View style={pujaSt.centerMandalaLayer1} />
                <View style={pujaSt.centerMandalaLayer2} />

                {/* Animated Rising Smoke (Agarbatti Dhoya) */}
                {[...Array(6)].map((_, i) => {
                    const driftY = smokeDrifts[i];
                    const translateY = driftY.interpolate({ inputRange: [0, 1], outputRange: [20, -100] }); // Rise up
                    const translateX = driftY.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 === 0 ? 8 : -8, 0] }); // Sway left/right
                    const opacity = driftY.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 0.5, 0.2, 0] }); // Fade out as it rises
                    const scale = driftY.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.5] }); // Expand slightly

                    const isLeft = i < 3;
                    const leftPos = isLeft ? 25 + (i * 8) : 230 + ((i - 3) * 8);

                    return (
                        <Animated.View key={`smoke-${i}`} style={[
                            pujaSt.smokeParticle,
                            {
                                left: leftPos,
                                bottom: 20, // Start from bottom
                                opacity: opacity,
                                transform: [{ translateY }, { translateX }, { scale }],
                            }
                        ]} />
                    );
                })}

                {/* Animated Falling Petals (Background Layer) */}
                {[...Array(6)].map((_, i) => {
                    const driftY = petalDrifts[i];
                    const translateY = driftY.interpolate({ inputRange: [0, 1], outputRange: [-20, 180] });
                    const rotate = driftY.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
                    const opacity = driftY.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.25 + (i % 2) * 0.2, 0.25 + (i % 2) * 0.2, 0] });

                    return (
                        <Animated.View key={`bg-petal-${i}`} style={[
                            pujaSt.petal,
                            {
                                left: `${(i * 18 + 5) % 100}%`,
                                top: 0,
                                opacity: opacity,
                                transform: [{ translateY }, { rotate }, { scale: 0.6 + (i % 3) * 0.2 }],
                            }
                        ]} />
                    );
                })}

                {/* Main Hero Animation (Durga-Puja.json text/art) */}
                {festival.animation && LottieView ? (
                    <View style={pujaSt.heroWrap} pointerEvents="none">
                        <LottieView
                            source={festival.animation}
                            autoPlay loop
                            style={pujaSt.heroLottie}
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <View style={pujaSt.heroWrap}>
                        <Text style={pujaSt.fallback}>🌸 Shubho Durga Puja!</Text>
                    </View>
                )}

                {/* Animated Falling Petals (Foreground Layer) */}
                {[...Array(6)].map((_, i) => {
                    const driftY = petalDrifts[6 + i];
                    const translateY = driftY.interpolate({ inputRange: [0, 1], outputRange: [-20, 180] });
                    const rotate = driftY.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }); // reverse spin
                    const opacity = driftY.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.5 + (i % 2) * 0.3, 0.5 + (i % 2) * 0.3, 0] });

                    return (
                        <Animated.View key={`fg-petal-${i}`} style={[
                            pujaSt.petal,
                            {
                                left: `${(i * 22 + 12) % 100}%`,
                                top: 0,
                                opacity: opacity,
                                transform: [{ translateY }, { rotate }, { scale: 1.1 + (i % 3) * 0.4 }],
                            }
                        ]} />
                    );
                })}

                {/* Auspicious Bottom Strip */}
                <View style={pujaSt.bottomStrip}>
                    <Text style={pujaSt.subtext}>🌺  Shubho Durga Puja  —  From Jharkhand Updates  🌺</Text>
                </View>
            </Animated.View>

            <TouchableOpacity style={pujaSt.closeBtn} onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={pujaSt.closePill}>
                    <Ionicons name="close" size={13} color="#991b1b" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const pujaSt = StyleSheet.create({
    card: {
        marginBottom: 16, borderRadius: 20, overflow: 'hidden',
        height: 155,
        elevation: 10,
        shadowColor: '#f59e0b', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
        borderWidth: 1.5, borderColor: 'rgba(251,191,36,0.5)', // Gold border
    },
    bgPrimary: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#7f1d1d', // Very deep Crimson Red
    },
    glowLeft: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#b91c1c', opacity: 0.4, // Brighter red glow
        top: -80, left: -60,
    },
    glowRight: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#d97706', opacity: 0.35, // Bright orange/gold glow
        bottom: -50, right: -40,
    },
    centerMandalaLayer1: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: '#fcd34d', opacity: 0.22, // Solid inner glow
        top: '5%', left: '50%', transform: [{ translateX: -70 }],
    },
    centerMandalaLayer2: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#fbbf24', opacity: 0.1, // Softer outer glow
        top: '-5%', left: '50%', transform: [{ translateX: -90 }],
    },
    smokeParticle: {
        position: 'absolute',
        width: 14, height: 26, borderRadius: 10,
        backgroundColor: '#e5e7eb', // Slightly grayish white dhoya
        opacity: 0.5,
        shadowColor: '#ffffff', shadowOpacity: 0.4, shadowRadius: 8,
    },
    petal: {
        position: 'absolute',
        width: 12, height: 8,
        borderTopLeftRadius: 10, borderBottomRightRadius: 10,
        backgroundColor: '#fbcfe8', // Soft pinkish-white petal color
        shadowColor: '#f472b6', shadowOpacity: 0.8, shadowRadius: 4,
    },
    heroWrap: {
        position: 'absolute',
        top: -10, left: -10, right: -10, bottom: 10, // Expanded area to scale up JSON heavily
        alignItems: 'center', justifyContent: 'center',
    },
    heroLottie: {
        width: '100%', height: '100%', // Reduced back to normal size so it fits!
    },
    fallback: {
        fontSize: 22, fontFamily: 'Outfit_700Bold',
        color: '#ffffff', textAlign: 'center', // Changed to white as requested
        textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
    bottomStrip: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingVertical: 7, paddingHorizontal: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,248,235,0.92)', // Light creamy gold
        borderTopWidth: 1, borderTopColor: 'rgba(251,191,36,0.8)',
    },
    subtext: {
        fontSize: 10, fontFamily: 'Outfit_700Bold',
        color: '#ffffff', letterSpacing: 0.3, // White text
        backgroundColor: '#7f1d1d', // Contrast so white text pops on strip (or just override strip color)
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
    },
    closeBtn: { position: 'absolute', top: 8, right: 8 },
    closePill: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 12, width: 24, height: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
    },
});

// ─── India Flag Premium Banner ───────────────────────────────────────────────
// Layout:
//  [tricolor bg]
//   LEFT  : indianflag.json Lottie (waving flag) — transparent, no container bg
//   RIGHT : Independence-Day.json Lottie (text animation) — transparent
//           + small "From Team Jharkhand Updates" subtext + dismiss
function IndiaFlagBanner({ festival, onDismiss, fadeAnim, slideAnim }) {
    return (
        <Animated.View style={[
            flagSt.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            {/* ── Tricolor stripes background ── */}
            <View style={[flagSt.stripe, { backgroundColor: SAFFRON, top: 0 }]} />
            <View style={[flagSt.stripe, { backgroundColor: FLAG_WHITE, top: '33.33%' }]} />
            <View style={[flagSt.stripe, { backgroundColor: INDIA_GREEN, top: '66.66%' }]} />
            <View style={flagSt.dimOverlay} />

            {/* ── MAIN HERO: 15aug.json fills entire widget ── */}
            {festival.animation && LottieView ? (
                <View style={flagSt.heroWrap} pointerEvents="none">
                    <LottieView
                        source={festival.animation}
                        autoPlay loop
                        style={flagSt.heroLottie}
                        resizeMode="contain"
                        speed={1}
                    />
                </View>
            ) : (
                <View style={flagSt.heroWrap}>
                    <Text style={flagSt.fallbackText}>🇮🇳{"\n"}Happy Independence Day!</Text>
                </View>
            )}

            {/* ── TOP-RIGHT FLOAT: indianflag.json waving ── */}
            {festival.flagAnimation && LottieView && (
                <View style={flagSt.flagFloat} pointerEvents="none">
                    <LottieView
                        source={festival.flagAnimation}
                        autoPlay loop
                        style={flagSt.flagLottie}
                        resizeMode="contain"
                        speed={0.85}
                    />
                </View>
            )}

            {/* ── BOTTOM STRIP: 🟧 white text 🟩 ── */}
            <View style={flagSt.bottomStrip}>
                <Text style={flagSt.subtext}>🟧  🙏 Jai Hind! — From Jharkhand Updates  🟩</Text>
            </View>

            {/* Dismiss */}
            <TouchableOpacity
                style={flagSt.closeBtn}
                onPress={onDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <View style={flagSt.closePill}>
                    <Ionicons name="close" size={13} color={ASHOKA_BLUE} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const flagSt = StyleSheet.create({
    card: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        height: 140,
        // hero is absolute-positioned
        elevation: 8,
        shadowColor: ASHOKA_BLUE,
        shadowOpacity: 0.22,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,80,0.10)',
    },
    stripe: {
        position: 'absolute', left: 0, right: 0, height: '33.34%',
    },
    dimOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    // Full-width hero: 15aug.json
    heroWrap: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 138,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLottie: {
        width: '100%',
        height: 148,
    },
    // Center floating flag (indianflag.json)
    flagFloat: {
        position: 'absolute',
        top: 8,
        left: 0, right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        height: 138,
    },
    flagLottie: {
        width: 195,
        height: 195,
    },
    fallbackText: {
        fontSize: 15, fontFamily: 'Outfit_700Bold',
        color: ASHOKA_BLUE, textAlign: 'center',
    },
    bottomStrip: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.28)',
        gap: 6,
    },
    subtext: {
        fontSize: 11, fontFamily: 'Outfit_600SemiBold',
        color: '#fff',
        letterSpacing: 0.3,
    },
    closeBtn: { position: 'absolute', top: 8, right: 8 },
    closePill: {
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderRadius: 12, width: 24, height: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(0,0,80,0.15)',
    },
});

// ─── Generic Banner (Holi, Diwali, etc.) ─────────────────────────────────────
function GenericBanner({ festival, onDismiss, fadeAnim, slideAnim }) {
    const [color1, color2] = festival.colors;
    return (
        <Animated.View style={[
            genSt.container,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
            <View style={[genSt.bgLayer1, { backgroundColor: color1 }]} />
            <View style={[genSt.bgLayer2, { backgroundColor: color2 }]} />
            <View style={[genSt.circle1, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
            <View style={[genSt.circle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

            {festival.animation && LottieView ? (
                <View style={genSt.lottieWrap} pointerEvents="none">
                    <LottieView
                        source={festival.animation}
                        autoPlay loop
                        style={genSt.lottie}
                        resizeMode="contain"
                    />
                </View>
            ) : (
                <View style={[genSt.lottieWrap, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 56 }}>{festival.emoji}</Text>
                </View>
            )}

            <View style={genSt.textArea}>
                <Text style={genSt.emoji}>{festival.emoji}</Text>
                <Text style={genSt.label} numberOfLines={2}>{festival.label}</Text>
                <Text style={genSt.subtext}>From Team Jharkhand Updates 🙏</Text>
            </View>

            <TouchableOpacity style={genSt.closeBtn} onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const genSt = StyleSheet.create({
    container: {
        marginBottom: 16, borderRadius: 20, overflow: 'hidden',
        minHeight: 110, flexDirection: 'row', alignItems: 'center',
        elevation: 6, shadowColor: '#000',
        shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    },
    bgLayer1: { ...StyleSheet.absoluteFillObject },
    bgLayer2: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '55%', opacity: 0.35 },
    circle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -40, right: 80 },
    circle2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, top: -20, right: 20 },
    lottieWrap: { width: 120, height: 110, overflow: 'hidden' },
    lottie: { width: 145, height: 145, marginLeft: -10, marginTop: -10 },
    textArea: { flex: 1, paddingRight: 36, paddingVertical: 14 },
    emoji: { fontSize: 22, marginBottom: 4 },
    label: {
        fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#fff', lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    subtext: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    closeBtn: { position: 'absolute', top: 10, right: 10 },
});

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function FestivalBanner({ isDarkMode, colors }) {
    const [festival, setFestival] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-24)).current;

    useEffect(() => {
        const f = getActiveFestival();
        if (f) {
            setFestival(f);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
            ]).start();
        }
    }, []);

    const handleDismiss = () => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
            .start(() => setDismissed(true));
    };

    if (!festival || dismissed) return null;

    if (festival.theme === 'india_flag') {
        return <IndiaFlagBanner festival={festival} onDismiss={handleDismiss} fadeAnim={fadeAnim} slideAnim={slideAnim} />;
    }
    if (festival.theme === 'diwali') {
        return <DiwaliThemeBanner festival={festival} onDismiss={handleDismiss} fadeAnim={fadeAnim} slideAnim={slideAnim} />;
    }
    if (festival.theme === 'christmas') {
        return <ChristmasThemeBanner festival={festival} onDismiss={handleDismiss} fadeAnim={fadeAnim} slideAnim={slideAnim} />;
    }
    if (festival.theme === 'eid') {
        return <EidThemeBanner festival={festival} onDismiss={handleDismiss} fadeAnim={fadeAnim} slideAnim={slideAnim} />;
    }
    if (festival.theme === 'durga_puja') {
        return <DurgaPujaThemeBanner festival={festival} onDismiss={handleDismiss} fadeAnim={fadeAnim} slideAnim={slideAnim} />;
    }
    return <GenericBanner festival={festival} onDismiss={handleDismiss} fadeAnim={fadeAnim} slideAnim={slideAnim} />;
}
