import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import TopHeader from '../components/TopHeader';
import { ThemeContext } from '../context/ThemeContext';

export default function MoreScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    // Shimmer animation for the Live Stream tile
    const shimmerX = useRef(new Animated.Value(-180)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerX, { toValue: 300, duration: 1800, useNativeDriver: true }),
                Animated.timing(shimmerX, { toValue: -180, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const handleNavigate = (screen) => {
        navigation.navigate(screen);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <TopHeader />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>More Options</Text>

                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Promotions')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#ecfdf5' }]}>
                            <Ionicons name="megaphone" size={24} color={isDarkMode ? '#34d399' : '#059669'} />
                        </View>
                        <Text style={styles.menuText}>Local Market</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Properties')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fef3c7' }]}>
                            <Ionicons name="home" size={24} color={isDarkMode ? '#fbbf24' : '#d97706'} />
                        </View>
                        <Text style={styles.menuText}>Properties</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Events')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fce7f3' }]}>
                            <Ionicons name="calendar" size={24} color={isDarkMode ? '#f472b6' : '#db2777'} />
                        </View>
                        <Text style={styles.menuText}>Events</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('EmailService')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#e0f2fe' }]}>
                            <Ionicons name="mail" size={24} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
                        </View>
                        <Text style={styles.menuText}>Email Service</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('LiveSports')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#ffedd5' }]}>
                            <Ionicons name="football" size={24} color={isDarkMode ? '#fb923c' : '#ea580c'} />
                        </View>
                        <Text style={styles.menuText}>Live Sports</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    {/* ── Live Stream — Coming Soon ── */}
                    <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                        {/* Icon box with shimmer */}
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#1a0a2e' : '#f3e8ff', overflow: 'hidden', position: 'relative' }]}>
                            <Animated.View style={{
                                position: 'absolute', top: 0, bottom: 0, width: 28,
                                backgroundColor: 'rgba(167,139,250,0.28)',
                                transform: [{ translateX: shimmerX }, { skewX: '-15deg' }],
                            }} />
                            <Ionicons name="wifi" size={24} color={isDarkMode ? '#c084fc' : '#9333ea'} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.menuText, { flex: 0, color: isDarkMode ? '#e2e8f0' : '#111827' }]}>Live Stream</Text>
                                {/* Pulsing LIVE dot */}
                                <MotiView
                                    from={{ scale: 1, opacity: 0.7 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{ type: 'timing', duration: 900, loop: true }}
                                    style={{ position: 'absolute', left: 100, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }}
                                />
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                            </View>
                            <Text style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: isDarkMode ? '#a855f7' : '#9333ea', letterSpacing: 1.5, marginTop: 2 }}>COMING SOON</Text>
                        </View>

                        <View style={[styles.comingSoonBadge, { backgroundColor: isDarkMode ? '#2e1065' : '#f3e8ff', borderColor: isDarkMode ? '#7c3aed' : '#d8b4fe' }]}>
                            <Ionicons name="lock-closed" size={13} color={isDarkMode ? '#c084fc' : '#9333ea'} />
                        </View>
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 100, // accommodate floating tab bar
    },
    pageTitle: {
        fontSize: 28, fontFamily: 'Outfit_700Bold',
        color: colors.text,
        marginBottom: 24,
        marginTop: 10,
    },
    menuContainer: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOpacity: isDarkMode ? 0.3 : 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: isDarkMode ? 1 : 0,
        borderColor: colors.border
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuText: {
        flex: 1,
        fontSize: 18, fontFamily: 'Outfit_500Medium',
        color: colors.text,
    },
    comingSoonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1.5,
    },
});



