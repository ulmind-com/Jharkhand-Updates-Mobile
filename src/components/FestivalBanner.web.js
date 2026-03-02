/**
 * FestivalBanner.web.js
 * Web stub — lottie-react-native is not supported on web.
 * Metro automatically picks this file for web builds instead of FestivalBanner.js.
 */
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FESTIVALS = [
    { key: 'new_year', label: 'Happy New Year!', emoji: '🎊', colors: ['#1e3a5f', '#0ea5e9'], month: 1, day: 1, windowDays: 2 },
    { key: 'republic_day', label: 'Happy Republic Day!', emoji: '🇮🇳', colors: ['#ff6600', '#1e8a3c'], month: 1, day: 26, windowDays: 2 },
    { key: 'holi', label: 'Happy Holi! 🎨', emoji: '🎨', colors: ['#f472b6', '#a855f7'], month: 2, day: 27, windowDays: 3 },
    { key: 'independence_day', label: 'Happy Independence Day!', emoji: '🇮🇳', colors: ['#16a34a', '#f97316'], month: 8, day: 15, windowDays: 2 },
    { key: 'diwali', label: 'Happy Diwali! 🪔', emoji: '🪔', colors: ['#92400e', '#f59e0b'], month: 10, day: 20, windowDays: 4 },
    { key: 'christmas', label: 'Merry Christmas!', emoji: '🎄', colors: ['#166534', '#dc2626'], month: 12, day: 25, windowDays: 2 },
];

function getActiveFestival() {
    const now = new Date();
    for (const f of FESTIVALS) {
        const anchor = new Date(now.getFullYear(), f.month - 1, f.day);
        const diff = (now - anchor) / (1000 * 60 * 60 * 24);
        if (diff >= -f.windowDays && diff <= f.windowDays) return f;
    }
    return null;
}

export default function FestivalBanner({ isDarkMode, colors }) {
    const [festival, setFestival] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const f = getActiveFestival();
        if (f) {
            setFestival(f);
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        }
    }, []);

    if (!festival || dismissed) return null;
    const [color1, color2] = festival.colors;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color1 }]} />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: color2, opacity: 0.3, left: '45%' }]} />

            {/* Emoji fallback instead of Lottie */}
            <View style={styles.emojiWrap}>
                <Text style={styles.bigEmoji}>{festival.emoji}</Text>
            </View>

            <View style={styles.textArea}>
                <Text style={styles.label}>{festival.label}</Text>
                <Text style={styles.subtext}>From Team Jharkhand Updates 🙏</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => {
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setDismissed(true));
            }}>
                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16, borderRadius: 20, overflow: 'hidden',
        minHeight: 90, flexDirection: 'row', alignItems: 'center',
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    },
    emojiWrap: { width: 90, alignItems: 'center', justifyContent: 'center' },
    bigEmoji: { fontSize: 52 },
    textArea: { flex: 1, paddingRight: 36, paddingVertical: 14 },
    label: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: '#fff', lineHeight: 22 },
    subtext: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    closeBtn: { position: 'absolute', top: 10, right: 10 },
});
