import React, { useState, useEffect } from 'react';
import { Vibration, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ThemeContext } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function PendingApprovalsScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [pendingCounts, setPendingCounts] = useState({
        events: 0, jobs: 0, community: 0, properties: 0, promotions: 0
    });

    const categories = [
        { id: 'jobs', label: 'Jobs', icon: 'briefcase', color: '#10b981' },
        { id: 'events', label: 'Events', icon: 'calendar', color: '#10b981' },
        { id: 'properties', label: 'Properties', icon: 'home', color: '#10b981' },
        { id: 'community', label: 'Community', icon: 'people', color: '#10b981' },
        { id: 'promotions', label: 'Promotions', icon: 'megaphone', color: '#10b981' }
    ];

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchPendingCounts();
        });
        fetchPendingCounts(); // initial fetch
        return unsubscribe;
    }, [navigation]);

    const fetchPendingCounts = async () => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (!token) return;

            const fetchCount = async (categoryStr) => {
                try {
                    const endpoint = categoryStr === 'promotions' ? 'admin/vendors/pending' : `${categoryStr}/pending`;
                    const res = await axios.get(`${BASE_URL}/${endpoint}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (categoryStr === 'promotions') {
                        return (res.data.vendors || res.data.data || []).length;
                    }
                    return (res.data.data || []).length;
                } catch (e) {
                    return 0;
                }
            };

            const [jobs, events, properties, community, promotions] = await Promise.all([
                fetchCount('jobs'),
                fetchCount('events'),
                fetchCount('properties'),
                fetchCount('community'),
                fetchCount('promotions')
            ]);

            setPendingCounts({ jobs, events, properties, community, promotions });
        } catch (e) {
            console.error("Error fetching pending counts:", e);
        }
    };

    const handleCategoryPress = (category) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        let apiCategory = category.id;
        if (apiCategory === 'promotions') apiCategory = 'admin/vendors';

        navigation.navigate('PendingCategoryList', {
            categoryId: apiCategory,
            categoryLabel: category.label
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => {
                    if (Platform.OS !== 'web') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
                    navigation.goBack();
                }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pending Approvals</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Review Content</Text>
                    <Text style={styles.sectionSubtitle}>Select a category to view items awaiting your approval.</Text>
                </View>

                {categories.map((cat, index) => {
                    const count = pendingCounts[cat.id] || 0;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.categoryCard}
                            onPress={() => handleCategoryPress(cat)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: cat.color + '15' }]}>
                                <Ionicons name={cat.icon} size={24} color={cat.color} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.categoryName}>{cat.label}</Text>
                            </View>

                            {count > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{count}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 8, marginLeft: -8, width: 40 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },
    content: { padding: 20 },
    sectionHeader: { marginBottom: 24 },
    sectionTitle: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8 },
    sectionSubtitle: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.2 : 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: colors.border },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    cardContent: { flex: 1 },
    categoryName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: colors.text },
    badge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, justifyContent: 'center', alignItems: 'center', minWidth: 24 },
    badgeText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold' }
});
