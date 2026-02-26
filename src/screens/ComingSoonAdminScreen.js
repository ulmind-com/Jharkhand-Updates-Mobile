import React from 'react';
import { Vibration, View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { View as MotiView } from 'moti';
import { ThemeContext } from '../context/ThemeContext';

export default function ComingSoonAdminScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Coming Soon</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 1000 }}
                    style={styles.iconContainer}
                >
                    <MotiView
                        from={{ rotate: '0deg' }}
                        animate={{ rotate: '360deg' }}
                        transition={{ loop: true, type: 'timing', duration: 15000, repeatReverse: false }}
                        style={styles.ring}
                    >
                        <Ionicons name="settings" size={32} color={colors.primary} style={styles.floatingIcon1} />
                        <Ionicons name="documents" size={32} color={colors.primary} style={styles.floatingIcon2} />
                        <Ionicons name="people" size={32} color={colors.primary} style={styles.floatingIcon3} />
                    </MotiView>
                    <View style={styles.centerCircle}>
                        <Ionicons name="shield-checkmark" size={64} color={colors.surface} />
                    </View>
                </MotiView>

                <MotiView
                    from={{ translateY: 20, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    transition={{ delay: 300, type: 'timing' }}
                    style={styles.textContainer}
                >
                    <Text style={styles.title}>Module Under Development</Text>
                    <Text style={styles.subtitle}>This administrative module is currently being built and will be available in a future update.</Text>
                </MotiView>

                <MotiView
                    from={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ loop: true, type: 'timing', duration: 1500 }}
                    style={styles.badge}
                >
                    <Text style={styles.badgeText}>DEVELOPMENT PREVIEW</Text>
                </MotiView>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10
    },
    backBtn: {
        marginLeft: -8,
        padding: 8
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Outfit_700Bold',
        color: colors.text
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
    },
    iconContainer: {
        width: 240,
        height: 240,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40
    },
    ring: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 2,
        borderColor: isDarkMode ? colors.surfaceDeeper : '#e2e8f0',
        borderStyle: 'dashed'
    },
    centerCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12
    },
    floatingIcon1: { position: 'absolute', top: -16, left: 104, backgroundColor: colors.background, borderRadius: 16, overflow: 'hidden' },
    floatingIcon2: { position: 'absolute', bottom: 20, left: -6, backgroundColor: colors.background, borderRadius: 16, overflow: 'hidden' },
    floatingIcon3: { position: 'absolute', bottom: 20, right: -6, backgroundColor: colors.background, borderRadius: 16, overflow: 'hidden' },
    textContainer: {
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontFamily: 'Outfit_800ExtraBold',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Outfit_400Regular',
        color: colors.textDim,
        lineHeight: 24,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 32
    },
    badge: {
        backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : '#dcfce7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary
    },
    badgeText: {
        color: colors.primary,
        fontFamily: 'Outfit_700Bold',
        fontSize: 12,
        letterSpacing: 1
    }
});
