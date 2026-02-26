import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../assets/logo.png');
const SOUND = require('../../assets/sounds/startup_chime.wav');

export default function SplashScreenAnimation({ onFinish }) {
    // Individual animated values for full control
    const bgOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.4)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textY = useRef(new Animated.Value(30)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const dotsOpacity = useRef(new Animated.Value(0)).current;
    const exitOpacity = useRef(new Animated.Value(1)).current;
    const soundRef = useRef(null);

    // Dot animations (staggered)
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        StatusBar.setHidden(true);

        // Play startup sound
        const playSound = async () => {
            try {
                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
                const { sound } = await Audio.Sound.createAsync(SOUND, { volume: 0.5 });
                soundRef.current = sound;
                await sound.playAsync();
            } catch (e) { /* silent fail if audio blocked */ }
        };
        playSound();

        // ① Background fade in
        Animated.timing(bgOpacity, {
            toValue: 1, duration: 300, useNativeDriver: true,
        }).start();

        // ② Logo scale + fade (spring bounce)
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1, tension: 60, friction: 7, useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1, duration: 400, useNativeDriver: true,
                }),
            ]).start();
        }, 200);

        // ③ App name slides up + fades in
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1, duration: 500, useNativeDriver: true,
                }),
                Animated.timing(textY, {
                    toValue: 0, duration: 500, useNativeDriver: true,
                }),
            ]).start();
        }, 700);

        // ④ Tagline fades in
        setTimeout(() => {
            Animated.timing(taglineOpacity, {
                toValue: 1, duration: 400, useNativeDriver: true,
            }).start();
        }, 1050);

        // ⑤ Loading dots bounce in
        setTimeout(() => {
            Animated.timing(dotsOpacity, {
                toValue: 1, duration: 300, useNativeDriver: true,
            }).start(() => {
                // Staggered dot pulsing loop
                const pulseDot = (anim, delay) => Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 0.25, duration: 300, useNativeDriver: true }),
                    ])
                ).start();
                pulseDot(dot1, 0);
                pulseDot(dot2, 200);
                pulseDot(dot3, 400);
            });
        }, 1350);

        // ⑥ Exit — fade out entire screen then call onFinish
        setTimeout(() => {
            Animated.timing(exitOpacity, {
                toValue: 0, duration: 500, useNativeDriver: true,
            }).start(() => {
                StatusBar.setHidden(false);
                soundRef.current?.unloadAsync();
                onFinish && onFinish();
            });
        }, 2800);
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
            <StatusBar hidden />
            <Animated.View style={[StyleSheet.absoluteFillObject, styles.bg, { opacity: bgOpacity }]} />

            {/* Decorative blobs */}
            <View style={styles.blobTop} />
            <View style={styles.blobBottom} />

            {/* Logo */}
            <Animated.View style={[styles.logoWrap, {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
            }]}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            {/* App name */}
            <Animated.Text style={[styles.appName, {
                opacity: textOpacity,
                transform: [{ translateY: textY }],
            }]}>
                Jharkhand Bihar Updates
            </Animated.Text>

            {/* Tagline */}
            <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                Your Local. Your Voice.
            </Animated.Text>

            {/* Loading dots */}
            <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
                {[dot1, dot2, dot3].map((anim, i) => (
                    <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
                ))}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#004d2e',
    },
    bg: {
        backgroundColor: '#004d2e',
    },
    // Decorative background circles
    blobTop: {
        position: 'absolute',
        top: -100,
        right: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    blobBottom: {
        position: 'absolute',
        bottom: -120,
        left: -60,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    // Logo
    logoWrap: {
        width: 140,
        height: 140,
        borderRadius: 34,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
        // Elegant shadow
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 16,
    },
    logo: {
        width: 110,
        height: 110,
    },
    // Text
    appName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        fontWeight: '500',
        textTransform: 'uppercase',
        marginBottom: 48,
    },
    // Loading dots
    dotsRow: {
        position: 'absolute',
        bottom: 60,
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
});
