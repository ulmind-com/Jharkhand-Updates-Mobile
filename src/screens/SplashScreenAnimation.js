import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, StatusBar, Animated, Easing, Text, Linking, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { MotiView, MotiText } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../assets/julogo-text-white.png');
const ULMIND_LOGO = require('../../assets/ulmind.png');
const SOUND = require('../../assets/sounds/startup_chime.wav');

export default function SplashScreenAnimation({ onFinish }) {
    const soundRef = useRef(null);
    const [isExiting, setIsExiting] = useState(false);
    const bgScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        StatusBar.setHidden(true);

        const playSound = async () => {
            try {
                await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
                const { sound } = await Audio.Sound.createAsync(SOUND, { volume: 0.4 });
                soundRef.current = sound;
                await sound.playAsync();
            } catch (e) { }
        };
        playSound();

        // Subtle background zoom
        Animated.timing(bgScale, {
            toValue: 1.05,
            duration: 4000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                StatusBar.setHidden(false);
                if (soundRef.current) soundRef.current.unloadAsync();
                if (onFinish) onFinish();
            }, 500); // Exiting duration
        }, 2500); // Display duration

        return () => {
            clearTimeout(timer);
            if (soundRef.current) soundRef.current.unloadAsync();
            StatusBar.setHidden(false);
        };
    }, []);

    return (
        <View style={styles.container}>
            {/* Cinematic Background - Pro Minimalistic */}
            <LinearGradient
                colors={['#011510', '#022c22', '#011510']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Animated Ambient Light Orbs */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: bgScale }], opacity: 0.6 }]}>
                <MotiView
                    style={StyleSheet.absoluteFillObject}
                    from={{ opacity: 0 }}
                    animate={{ opacity: isExiting ? 0 : 1 }}
                    transition={{ type: 'timing', duration: 800 }}
                >
                    <MotiView
                        style={[styles.ambientGlow, { top: '-10%', left: '-20%' }]}
                        from={{ scale: 0.8, opacity: 0.1 }}
                        animate={{ scale: 1.2, opacity: 0.2 }}
                        transition={{ loop: true, type: 'timing', duration: 4000, direction: 'alternate' }}
                    />
                    <MotiView
                        style={[styles.ambientGlow, { bottom: '-10%', right: '-20%', backgroundColor: '#10b981' }]}
                        from={{ scale: 1.2, opacity: 0.15 }}
                        animate={{ scale: 0.8, opacity: 0.25 }}
                        transition={{ loop: true, type: 'timing', duration: 5000, direction: 'alternate' }}
                    />
                </MotiView>
            </Animated.View>

            {/* Main Content */}
            <MotiView
                style={styles.contentContainer}
                from={{ opacity: 0 }}
                animate={{ opacity: isExiting ? 0 : 1 }}
                transition={{ type: 'timing', duration: 500 }}
            >
                {/* Logo - Elegant smooth scale up */}
                <MotiView
                    from={{ opacity: 0, scale: 0.92, translateY: 10 }}
                    animate={{ opacity: 1, scale: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 1200, delay: 100 }}
                    style={styles.logoContainer}
                >
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                </MotiView>

                {/* Text Section */}
                <View style={styles.textContainer}>
                    <MotiText
                        style={styles.tagline}
                        from={{ opacity: 0, translateY: 15 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 1000, delay: 600 }}
                    >
                        YOUR REGION. YOUR VOICE.
                    </MotiText>
                </View>

                {/* Premium Clean Loader */}
                <MotiView
                    style={styles.loaderLineContainer}
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 800, delay: 1000 }}
                >
                    <MotiView
                        style={styles.loaderLine}
                        from={{ width: '0%', opacity: 0.5 }}
                        animate={{ width: '100%', opacity: 1 }}
                        transition={{ type: 'timing', duration: 1500, delay: 1000 }}
                    />
                </MotiView>
            </MotiView>

            {/* Powered By Logo */}
            <MotiView
                style={styles.footerContainer}
                from={{ opacity: 0 }}
                animate={{ opacity: isExiting ? 0 : 1 }}
                transition={{ type: 'timing', duration: 800, delay: 1200 }}
            >
                <TouchableOpacity 
                    style={styles.poweredByWrapper} 
                    activeOpacity={0.7} 
                    onPress={() => Linking.openURL('https://www.ulmind.com')}
                >
                    <Text style={styles.poweredByText}>POWERED BY</Text>
                    <Image source={ULMIND_LOGO} style={styles.ulmindLogo} resizeMode="contain" />
                </TouchableOpacity>
            </MotiView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#011510',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ambientGlow: {
        position: 'absolute',
        width: width * 1.2,
        height: width * 1.2,
        borderRadius: width * 0.6,
        backgroundColor: '#059669',
        filter: 'blur(40px)', // Web fallback, React Native ignores this typically but good practice if web is used.
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        width: '100%',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 260,
        height: 260,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: -30, // Pull closer to logo since the logo image has whitespace natively
    },
    tagline: {
        fontSize: 12,
        fontWeight: '500',
        color: '#a7f3d0',
        letterSpacing: 4.5,
        textTransform: 'uppercase',
        opacity: 0.9,
    },
    loaderLineContainer: {
        marginTop: 60,
        width: 140,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    loaderLine: {
        height: '100%',
        backgroundColor: '#10b981',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    poweredByWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10, // increase clickable area
    },
    poweredByText: {
        color: '#a7f3d0',
        fontWeight: '600',
        fontSize: 11,
        letterSpacing: 2,
        opacity: 0.7,
        marginRight: 2, // Space between text and logo reduced
    },
    ulmindLogo: {
        width: 100, // Slightly smaller to fit nicely in a row
        height: 25,
        opacity: 0.9,
        marginLeft: -12, // Pull logo closer to text (compensating for image padding)
    },
    version: {
        color: '#ffffff',
        fontWeight: '400',
        fontSize: 11,
        letterSpacing: 2,
        opacity: 0.4,
    },
});
