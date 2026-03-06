import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { MotiView } from 'moti';
import { ThemeContext } from '../context/ThemeContext';

export default function MyPostsScreen() {
    const navigation = useNavigation();
    const [role, setRole] = useState('user');
    const [pendingCounts, setPendingCounts] = useState({});
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

    useEffect(() => {
        const fetchRoleAndCounts = async () => {
            let userRole = Platform.OS === 'web' ? localStorage.getItem('role') : await SecureStore.getItemAsync('role');
            if (userRole) setRole(userRole);

            if (userRole === 'admin') {
                const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                if (!token) return;

                const fetchCount = async (categoryStr) => {
                    try {
                        const res = await axios.get(`${BASE_URL}/${categoryStr}/pending`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        return (res.data.data || []).length;
                    } catch (e) {
                        return 0;
                    }
                };

                const [jobs, events, properties, community] = await Promise.all([
                    fetchCount('jobs'),
                    fetchCount('events'),
                    fetchCount('properties'),
                    fetchCount('community')
                ]);

                setPendingCounts({
                    jobs, events, properties, community
                });
            }
        };
        fetchRoleAndCounts();
    }, []);

    const categories = [
        { id: 'jobs', label: 'Jobs', icon: 'briefcase', color: '#10b981' },
        { id: 'events', label: 'Events', icon: 'calendar', color: '#10b981' },
        { id: 'properties', label: 'Properties', icon: 'home', color: '#10b981' },
        { id: 'community', label: 'Citizen News', icon: 'people', color: '#10b981' }
    ];

    if (role === 'admin') {
        categories.push({ id: 'stateNews', label: 'State News', icon: 'newspaper', color: '#10b981' });
    }

    const handleSelectCategory = (category) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        navigation.navigate('MyPostsList', { categoryId: category.id, categoryLabel: category.label });
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
                <Text style={styles.headerTitle}>My Posts & Listings</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.subtitle}>Select a category to view your posts</Text>

                {categories.map((cat, index) => (
                    <MotiView
                        key={cat.id}
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: index * 50 }}
                    >
                        <TouchableOpacity style={styles.card} onPress={() => handleSelectCategory(cat)}>
                            <View style={[styles.iconBox, { backgroundColor: cat.color + '1A' }]}>
                                <Ionicons name={cat.icon} size={24} color={cat.color} />
                            </View>
                            <Text style={styles.cardLabel}>{cat.label}</Text>
                            {role === 'admin' && pendingCounts[cat.id] > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{pendingCounts[cat.id]}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                        </TouchableOpacity>
                    </MotiView>
                ))}
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 8, marginLeft: -8, width: 40 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },
    content: { padding: 20 },
    subtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginBottom: 20 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.03, shadowRadius: 8, elevation: 1 },
    iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    cardLabel: { flex: 1, fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: colors.text },
    badge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold' }
});
