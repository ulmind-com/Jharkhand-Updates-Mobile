import React, { useState, useCallback } from 'react';
import { Vibration, View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { View as MotiView } from 'moti';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function AdminDashboardScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [totalPending, setTotalPending] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const fetchPending = async () => {
                try {
                    const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                    if (!token) return;

                    const fetchCount = async (categoryStr) => {
                        try {
                            const endpoint = categoryStr === 'promotions' ? 'admin/vendors/pending' : `${categoryStr}/pending`;
                            const res = await axios.get(`${BASE_URL}/${endpoint}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            return (categoryStr === 'promotions' ? res.data.vendors || res.data.data || [] : res.data.data || []).length;
                        } catch (e) {
                            return 0;
                        }
                    };

                    const counts = await Promise.all(['jobs', 'events', 'properties', 'community', 'promotions'].map(fetchCount));
                    const total = counts.reduce((a, b) => a + b, 0);
                    setTotalPending(total);
                } catch (e) { }
            };
            fetchPending();
        }, [])
    );

    const adminOptions = [
        {
            title: "Pending Approvals",
            icon: "time",
            color: "#f59e0b", // Amber
            bg: "#fef3c7",
            route: "PendingApprovals"
        },
        {
            title: "View Properties",
            icon: "home",
            color: "#3b82f6", // Blue
            bg: "#dbeafe",
            route: "AdminProperties"
        },
        {
            title: "Property Leads",
            icon: "call",
            color: "#ea580c", // Orange
            bg: "#ffedd5",
            route: "AdminPropertyLeads"
        },
        {
            title: "Advertisements",
            icon: "image",
            color: "#8b5cf6", // Purple
            bg: "#ede9fe",
            route: "ComingSoonAdmin"
        }
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Management Modules</Text>

                <View style={styles.grid}>
                    {adminOptions.map((item, index) => (
                        <MotiView
                            key={item.title}
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', delay: index * 100 }}
                            style={styles.gridItemWrapper}
                        >
                            <TouchableOpacity
                                style={styles.gridItem}
                                onPress={() => navigation.navigate(item.route)}
                            >
                                <View style={[styles.iconWrapper, { backgroundColor: isDarkMode ? colors.surfaceDeeper : item.bg }]}>
                                    <Ionicons name={item.icon} size={32} color={item.color} />
                                    {item.route === 'PendingApprovals' && totalPending > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{totalPending}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.itemTitle}>{item.title}</Text>
                            </TouchableOpacity>
                        </MotiView>
                    ))}
                </View>
            </ScrollView>
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
        borderBottomColor: colors.border
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
        padding: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.textDim,
        marginBottom: 20
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItemWrapper: {
        width: '48%',
        marginBottom: 16,
    },
    gridItem: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.05,
        shadowRadius: 4,
        height: 160
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#ef4444',
        height: 24,
        minWidth: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: colors.surface
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Outfit_700Bold'
    },
    itemTitle: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
        color: colors.text,
        textAlign: 'center'
    }
});
