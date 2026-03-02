import React, { useEffect, useRef } from 'react';
import {
    View, Text, Image, StyleSheet, Animated, Dimensions, StatusBar,
} from 'react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../assets/julogo.png');
const SOUND = require('../../assets/sounds/startup_chime.wav');

// Particle component
const Particle = ({ x, y, size, delay, color }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: -30, duration: 1500, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: -60, duration: 1000, useNativeDriver: true }),
                ]),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <Animated.View style={{
            position: 'absolute', left: x, top: y,
            opacity, transform: [{ translateY }, { scale }],
        }}>
            <View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: color,
            }} />
        </Animated.View>
    );
};

// Shimmer bar component
const ShimmerBar = ({ delay }) => {
    const shimmerX = useRef(new Animated.Value(-width)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setTimeout(() => {
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerX, { toValue: width * 2, duration: 1800, useNativeDriver: true }),
                    Animated.timing(shimmerX, { toValue: -width, duration: 0, useNativeDriver: true }),
                ])
            ).start();
        }, delay);
    }, []);

    return (
        <Animated.View style={{ opacity, overflow: 'hidden', width: 140, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 6 }}>
            <Animated.View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                transform: [{ translateX: shimmerX }],
            }}>
                <View style={{
                    width: 80, height: 3,
                    backgroundColor: 'rgba(255,255,255,0.55)',
                    borderRadius: 2,
                }} />
            </Animated.View>
        </Animated.View>
    );
};

// Pulsing ring around logo
const PulseRing = ({ delay, size, color }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        setTimeout(() => {
            Animated.loop(
                Animated.parallel([
                    Animated.timing(scale, { toValue: 1.7, duration: 1500, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
                ])
            ).start();
        }, delay);
    }, []);

    return (
        <Animated.View style={{
            position: 'absolute',
            width: size, height: size, borderRadius: size / 2,
            borderWidth: 2, borderColor: color,
            transform: [{ scale }], opacity,
        }} />
    );
};

export default function SplashScreenAnimation({ onFinish }) {
    const bgOpacity = useRef(new Animated.Value(0)).current;
    const logoContainerScale = useRef(new Animated.Value(0.3)).current;
    const logoContainerOpacity = useRef(new Animated.Value(0)).current;
    const logoRotate = useRef(new Animated.Value(0)).current;
    const textScale = useRef(new Animated.Value(0.85)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textY = useRef(new Animated.Value(20)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const taglineX = useRef(new Animated.Value(-20)).current;
    const dotsOpacity = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const progressOpacity = useRef(new Animated.Value(0)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;
    const ringVisible = useRef(new Animated.Value(0)).current;
    const logoGlow = useRef(new Animated.Value(0)).current;

    const dot1 = useRef(new Animated.Value(0.25)).current;
    const dot2 = useRef(new Animated.Value(0.25)).current;
    const dot3 = useRef(new Animated.Value(0.25)).current;

    const soundRef = useRef(null);

    // Particles config
    const particles = [
        { x: width * 0.1, y: height * 0.55, size: 6, delay: 100, color: 'rgba(134,239,172,0.6)' },
        { x: width * 0.85, y: height * 0.45, size: 5, delay: 400, color: 'rgba(167,243,208,0.5)' },
        { x: width * 0.2, y: height * 0.65, size: 4, delay: 200, color: 'rgba(52,211,153,0.5)' },
        { x: width * 0.75, y: height * 0.6, size: 7, delay: 600, color: 'rgba(110,231,183,0.4)' },
        { x: width * 0.5, y: height * 0.72, size: 4, delay: 300, color: 'rgba(255,255,255,0.3)' },
        { x: width * 0.35, y: height * 0.7, size: 5, delay: 500, color: 'rgba(16,185,129,0.5)' },
        { x: width * 0.65, y: height * 0.68, size: 6, delay: 700, color: 'rgba(255,255,255,0.25)' },
        { x: width * 0.9, y: height * 0.3, size: 4, delay: 900, color: 'rgba(52,211,153,0.4)' },
        { x: width * 0.05, y: height * 0.35, size: 5, delay: 800, color: 'rgba(167,243,208,0.4)' },
    ];

    useEffect(() => {
        StatusBar.setHidden(true);

        // Play smooth chime sound
        const playSound = async () => {
            try {
                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
                const { sound } = await Audio.Sound.createAsync(SOUND, { volume: 0.65 });
                soundRef.current = sound;
                await sound.playAsync();
            } catch (e) { /* silent */ }
        };
        playSound();

        // ① Background fade in (gradient appears)
        Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

        // ② Logo container: scale up with spring + rotate slightly + fade
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(logoContainerScale, {
                    toValue: 1, tension: 55, friction: 6, useNativeDriver: true,
                }),
                Animated.timing(logoContainerOpacity, {
                    toValue: 1, duration: 500, useNativeDriver: true,
                }),
                Animated.timing(logoRotate, {
                    toValue: 1, duration: 600, useNativeDriver: true,
                }),
            ]).start();
        }, 200);

        // ③ Logo glow pulse starts
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(logoGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(logoGlow, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
                ])
            ).start();
        }, 800);

        // ④ Rings pulse
        setTimeout(() => {
            Animated.timing(ringVisible, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        }, 700);

        // ⑤ App name slides up with spring + scale
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(textScale, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
                Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(textY, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
        }, 800);

        // ⑥ Tagline slides in from left
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(taglineX, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
        }, 1100);

        // ⑦ Progress bar appears + fills
        setTimeout(() => {
            Animated.timing(progressOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            Animated.timing(progressWidth, { toValue: 1, duration: 1600, useNativeDriver: false }).start();
        }, 1300);

        // ⑧ Dots appear with pulsing
        setTimeout(() => {
            Animated.timing(dotsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
                const pulseDot = (anim, delay) => Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.spring(anim, { toValue: 1, tension: 80, friction: 4, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 0.25, duration: 300, useNativeDriver: true }),
                    ])
                ).start();
                pulseDot(dot1, 0);
                pulseDot(dot2, 200);
                pulseDot(dot3, 400);
            });
        }, 1500);

        // ⑨ Exit
        setTimeout(() => {
            Animated.timing(exitOpacity, {
                toValue: 0, duration: 600, useNativeDriver: true,
            }).start(() => {
                StatusBar.setHidden(false);
                if (soundRef.current) soundRef.current.unloadAsync();
                onFinish && onFinish();
            });
        }, 3000);
    }, []);

    const logoRotateDeg = logoRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['-8deg', '0deg'],
    });

    const glowOpacity = logoGlow.interpolate({
        inputRange: [0.3, 1],
        outputRange: [0.3, 1],
    });

    return (
        <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
            <StatusBar hidden />

            {/* Simulated gradient background using layered Views */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: bgOpacity }]}>
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#003d24' }]} />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,102,54,0.7)', top: 0, bottom: '50%' }]} />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,133,74,0.4)', top: '25%', bottom: '25%' }]} />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,77,46,0.5)', top: '60%', bottom: 0 }]} />
            </Animated.View>

            {/* Decorative mesh circles */}
            <View style={styles.meshTop} />
            <View style={styles.meshTopRight} />
            <View style={styles.meshBottom} />
            <View style={styles.meshBottomLeft} />

            {/* Grid pattern overlay (faint lines) */}
            <View style={styles.gridOverlay}>
                {[...Array(8)].map((_, i) => (
                    <View key={i} style={[styles.gridLine, { top: i * (height / 8) }]} />
                ))}
            </View>

            {/* Floating particles */}
            {particles.map((p, i) => (
                <Particle key={i} {...p} />
            ))}

            {/* Logo with glow rings */}
            <Animated.View style={[styles.logoContainer, {
                transform: [{ scale: logoContainerScale }, { rotate: logoRotateDeg }],
                opacity: logoContainerOpacity,
            }]}>
                {/* Outer glow ring */}
                <Animated.View style={[styles.outerRing, { opacity: ringVisible }]}>
                    <PulseRing delay={0} size={195} color="rgba(52,211,153,0.35)" />
                    <PulseRing delay={500} size={195} color="rgba(134,239,172,0.25)" />
                </Animated.View>

                {/* Logo glow (ambient) */}
                <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />

                {/* Logo card */}
                <View style={styles.logoCard}>
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                </View>
            </Animated.View>

            {/* App name */}
            <Animated.View style={{
                opacity: textOpacity,
                transform: [{ translateY: textY }, { scale: textScale }],
                alignItems: 'center',
            }}>
                <Text style={styles.appName}>Jharkhand Updates</Text>
                <ShimmerBar delay={1200} />
            </Animated.View>

            {/* Tagline */}
            <Animated.Text style={[styles.tagline, {
                opacity: taglineOpacity,
                transform: [{ translateX: taglineX }],
            }]}>
                Your Region. Your Voice.
            </Animated.Text>

            {/* Progress bar */}
            <Animated.View style={[styles.progressContainer, { opacity: progressOpacity }]}>
                <Animated.View style={[styles.progressBar, {
                    width: progressWidth.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                    }),
                }]} />
            </Animated.View>

            {/* Loading dots */}
            <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
                {[dot1, dot2, dot3].map((anim, i) => (
                    <Animated.View key={i} style={[styles.dot, { opacity: anim, transform: [{ scale: anim }] }]} />
                ))}
            </Animated.View>

            {/* Version tag */}
            <Animated.Text style={[styles.versionTag, { opacity: taglineOpacity }]}>
                v1.0
            </Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#003d24',
    },
    // Decorative mesh circles
    meshTop: {
        position: 'absolute', top: -150, right: -100,
        width: 380, height: 380, borderRadius: 190,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    meshTopRight: {
        position: 'absolute', top: 50, right: -180,
        width: 280, height: 280, borderRadius: 140,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    meshBottom: {
        position: 'absolute', bottom: -160, left: -80,
        width: 360, height: 360, borderRadius: 180,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    meshBottomLeft: {
        position: 'absolute', bottom: 80, left: -140,
        width: 240, height: 240, borderRadius: 120,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    // Grid
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    gridLine: {
        position: 'absolute', left: 0, right: 0, height: 1,
        backgroundColor: 'rgba(255,255,255,0.025)',
    },
    // Logo area
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 36,
    },
    outerRing: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 195,
        height: 195,
    },
    logoGlow: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        backgroundColor: 'rgba(52,211,153,0.22)',
    },
    logoCard: {
        width: 150,
        height: 150,
        borderRadius: 38,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10b981',
        shadowOpacity: 0.45,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 16 },
        elevation: 24,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
    },
    logo: {
        width: 115,
        height: 115,
    },
    // Text
    appName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.8,
        textAlign: 'center',
        textShadowColor: 'rgba(16,185,129,0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 12,
        marginBottom: 2,
    },
    tagline: {
        fontSize: 12,
        color: 'rgba(167,243,208,0.8)',
        letterSpacing: 3.5,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 10,
        marginBottom: 36,
    },
    // Progress bar
    progressContainer: {
        width: width * 0.55,
        height: 3,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBar: {
        height: 3,
        borderRadius: 2,
        backgroundColor: '#34d399',
        shadowColor: '#34d399',
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    // Loading dots
    dotsRow: {
        flexDirection: 'row',
        gap: 7,
        marginTop: 2,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#6ee7b7',
    },
    // Version
    versionTag: {
        position: 'absolute',
        bottom: 40,
        fontSize: 11,
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: 1,
        fontWeight: '500',
    },
});
