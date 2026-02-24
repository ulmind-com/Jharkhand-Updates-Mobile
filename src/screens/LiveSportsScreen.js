import React, { useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import TopHeader from '../components/TopHeader';

const { width } = Dimensions.get('window');

export default function LiveSportsScreen() {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <TopHeader />
            <View style={styles.content}>

                {/* Animated Icon Ring */}
                <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15, delay: 100 }}
                    style={styles.iconWrapper}
                >
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{ loop: true, type: 'timing', duration: 10000 }}
                        style={styles.backgroundRing}
                    >
                        <Ionicons name="football-outline" size={80} color={isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)'} style={{ position: 'absolute', top: -10, left: 10 }} />
                        <Ionicons name="tennisball-outline" size={70} color={isDarkMode ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.1)'} style={{ position: 'absolute', bottom: -10, right: 10 }} />
                        <Ionicons name="basketball-outline" size={90} color={isDarkMode ? 'rgba(251, 146, 60, 0.15)' : 'rgba(234, 88, 12, 0.1)'} style={{ position: 'absolute', top: 50, right: -20 }} />
                        <Ionicons name="baseball-outline" size={60} color={isDarkMode ? 'rgba(248, 113, 113, 0.15)' : 'rgba(220, 38, 38, 0.1)'} style={{ position: 'absolute', bottom: 40, left: -10 }} />
                    </MotiView>

                    <View style={styles.centerIconBox}>
                        <Ionicons name="trophy" size={64} color="#f59e0b" />
                    </View>
                </MotiView>

                {/* Animated Text Content */}
                <MotiView
                    from={{ translateY: 30, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 300 }}
                    style={styles.textContainer}
                >
                    <Text style={styles.title}>Live Sports</Text>
                    <View style={styles.badgeContainer}>
                        <MotiView
                            from={{ opacity: 0.5, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1.05 }}
                            transition={{ loop: true, type: 'timing', duration: 800, direction: 'alternate' }}
                            style={styles.comingSoonBadge}
                        >
                            <Text style={styles.badgeText}>COMING SOON</Text>
                        </MotiView>
                    </View>

                    <Text style={styles.description}>
                        Get ready to catch real-time scores, match highlights, and live updates from your favorite local and international tournaments.
                    </Text>

                    <Text style={styles.subtext}>
                        We are currently building this feature. Stay tuned!
                    </Text>
                </MotiView>

            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    iconWrapper: {
        width: width * 0.8,
        height: width * 0.8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    backgroundRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: width * 0.4,
        borderWidth: 2,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        borderStyle: 'dashed',
    },
    centerIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Outfit_800ExtraBold',
        color: colors.text,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    badgeContainer: {
        marginBottom: 24,
    },
    comingSoonBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: colors.primaryLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
    },
    badgeText: {
        color: '#ffffff',
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
        letterSpacing: 2,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    subtext: {
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        color: isDarkMode ? colors.textDim : '#9ca3af',
        textAlign: 'center',
        opacity: 0.8,
    }
});
