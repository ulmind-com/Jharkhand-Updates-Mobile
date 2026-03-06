import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { MotiView } from 'moti';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function PendingCategoryListScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { categoryId, categoryLabel } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingItems();
    }, [categoryId]);

    const fetchPendingItems = async () => {
        setLoading(true);
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const res = await axios.get(`${BASE_URL}/${categoryId}/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let data = res.data.data || [];
            if (categoryId === 'admin/vendors') {
                data = res.data.vendors || res.data.data || [];
            }

            // Sort to latest first
            data.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
            setItems(data);
        } catch (error) {
            console.error(`Error fetching pending ${categoryId}:`, error);
            Toast.show({ type: 'error', text1: 'Loading Error', text2: `Failed to load pending ${categoryLabel}` });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (item, action) => {
        try {
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            // Optimistic UI Removal
            setItems(prev => prev.filter(i => i.id !== item.id && i._id !== (item._id || item.id)));

            await axios.post(`${BASE_URL}/${categoryId === 'admin/vendors' ? 'vendors' : categoryId}/${item.id || item._id}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Removed success popup as requested by the admin
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            console.error(`Error ${action}ing ${categoryId}:`, error);
            Toast.show({ type: 'error', text1: 'Action Failed', text2: `Could not ${action} item` });
            fetchPendingItems(); // Refresh to restore on failure
        }
    };

    const confirmAction = (item, action) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to ${action} this request?`)) {
                handleAction(item, action);
            }
        } else {
            Alert.alert(`Confirm ${action}`, `Are you sure you want to ${action} this request?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Yes", onPress: () => handleAction(item, action), style: action === 'reject' ? "destructive" : "default" }
            ]);
        }
    };

    const handleView = (item) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        const id = item.id || item._id;
        if (categoryId === 'properties') navigation.navigate('PropertyDetails', { propertyId: id });
        else if (categoryId === 'events') navigation.navigate('EventDetails', { eventId: id });
        else if (categoryId === 'jobs') navigation.navigate('JobDetails', { jobId: id });
        else if (categoryId === 'community') navigation.navigate('CommunityPostDetails', { postId: id });
        else if (categoryId === 'admin/vendors') navigation.navigate('VendorShop', { vendorId: id });
    };

    const renderItem = ({ item }) => {
        let title = item.title || item.name || item.brandName || "Untitled Request";
        let subtitle = "";
        let prefixIcon = '';

        if (categoryId === 'community') {
            title = item.title || item.content?.substring(0, 30) + '...';
            subtitle = `By: ${item.author?.firstName || 'User'} ${item.author?.lastName || ''}`;
            prefixIcon = '👥 ';
        } else if (categoryId === 'jobs') {
            subtitle = `${item.company || 'Unknown Company'} • ${item.location || 'Unknown Location'}`;
            prefixIcon = '💼 ';
        } else if (categoryId === 'events') {
            prefixIcon = '🔥 ';
            if (item.eventDate) {
                const date = new Date(item.eventDate);
                subtitle = `Date: ${date.toLocaleDateString()}`;
            }
        } else if (categoryId === 'properties') {
            prefixIcon = '🏠 ';
            subtitle = `${item.propertyType || ''} • ${item.city || 'Location N/A'}`;
        } else if (categoryId === 'admin/vendors') {
            prefixIcon = '🏪 ';
            subtitle = `Shop: ${item.category || 'Vendor'}`;
        }

        const dateStr = item.createdAt || item.date || new Date().toISOString();
        const createdDate = new Date(dateStr).toLocaleDateString();

        return (
            <MotiView style={styles.postCard} from={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1}>{prefixIcon}{title}</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>PENDING</Text>
                        </View>
                    </View>

                    <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>

                    <View style={styles.dateRow}>
                        <Text style={styles.dateText}>Created: {createdDate}</Text>
                    </View>
                </View>

                <View style={styles.actionDivider} />

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => handleView(item)}>
                        <Ionicons name="eye-outline" size={16} color="#3b82f6" />
                        <Text style={styles.viewBtnText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => confirmAction(item, 'approve')}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => confirmAction(item, 'reject')}>
                        <Ionicons name="close-circle" size={16} color="#ef4444" />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            </MotiView>
        );
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
                <Text style={styles.headerTitle}>Pending {categoryLabel}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : items.length > 0 ? (
                <FlatList
                    data={items}
                    keyExtractor={(item, index) => `${item.id || item._id}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.centerBox}>
                    <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.textDim} />
                    <Text style={styles.emptyTitle}>You're all caught up!</Text>
                    <Text style={styles.emptyDesc}>There are no pending requests for {categoryLabel}.</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 8, marginLeft: -8, width: 40 },
    headerTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.text },
    listContainer: { padding: 12 },
    postCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ef4444', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.2 : 0.03, shadowRadius: 8, elevation: 1 },
    cardInfo: { marginBottom: 10 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { flex: 1, fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.text, marginRight: 10 },
    statusBadge: { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusText: { color: '#ef4444', fontSize: 9, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    subtitleText: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: colors.textDim, marginBottom: 6 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateText: { fontSize: 11, fontFamily: 'Outfit_500Medium', color: colors.textDim },
    actionDivider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flex: 1, justifyContent: 'center' },
    viewBtn: { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' },
    viewBtnText: { marginLeft: 4, color: isDarkMode ? '#60a5fa' : '#3b82f6', fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
    approveBtn: { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' },
    approveBtnText: { marginLeft: 4, color: isDarkMode ? '#34d399' : '#10b981', fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
    rejectBtn: { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2' },
    rejectBtnText: { marginLeft: 4, color: isDarkMode ? '#f87171' : '#ef4444', fontFamily: 'Outfit_600SemiBold', fontSize: 13 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', color: colors.text, marginTop: 16, marginBottom: 8 },
    emptyDesc: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, textAlign: 'center', lineHeight: 20 }
});
