import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function HistoryScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            let token = null;
            if (Platform.OS === 'web') {
                token = localStorage.getItem('accessToken');
            } else {
                token = await SecureStore.getItemAsync('accessToken');
            }

            if (!token) return;

            const res = await axios.get(`${BASE_URL}/history/state-news`, {
                params: { page: 0, size: 20 },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.data?.content) {
                setHistoryItems(res.data.data.content);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
            Toast.show({ type: 'error', text1: 'Could not load history' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSingle = async (newsId) => {
        const executeDelete = async () => {
            try {
                let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                await axios.delete(`${BASE_URL}/history/state-news/${newsId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistoryItems(prev => prev.filter(item => item.contentDetails?.id !== newsId));
                Toast.show({ type: 'success', text1: 'Item removed from history' });
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Failed to delete item' });
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Delete this item from your history?")) executeDelete();
        } else {
            Alert.alert("Remove History", "Delete this item from your history?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: executeDelete }
            ]);
        }
    };

    const handleClearAll = async () => {
        const executeClear = async () => {
            try {
                let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
                await axios.delete(`${BASE_URL}/history/state-news/clear`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistoryItems([]);
                Toast.show({ type: 'success', text1: 'History cleared successfully' });
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Failed to clear history' });
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to clear your entire history?")) executeClear();
        } else {
            Alert.alert("Clear All", "Are you sure you want to clear your entire history?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear All", style: "destructive", onPress: executeClear }
            ]);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderHistoryItem = ({ item }) => {
        const news = item.contentDetails;
        if (!news) return null;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('StateNewsDetails', { newsId: news.id })}
            >
                {news.imageUrls && news.imageUrls.length > 0 ? (
                    <Image source={{ uri: news.imageUrls[0] }} style={styles.cardImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="newspaper-outline" size={24} color={colors.textDim} />
                    </View>
                )}

                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{news.title}</Text>
                    <View style={styles.cardFooter}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>News</Text>
                        </View>
                        <Text style={styles.dateText}>{formatDate(item.viewedAt)}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSingle(news.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => { if (Platform.OS !== 'web') Platform.OS === 'android' ? require('react-native').Vibration.vibrate(80) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Read History</Text>

                {historyItems.length > 0 ? (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
                        <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 65 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : historyItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <Ionicons name="time-outline" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>No History Found</Text>
                    <Text style={styles.emptySub}>You haven't read any news articles yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={historyItems}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderHistoryItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border
    },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: colors.text },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyIconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 8 },
    emptySub: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: colors.textDim, textAlign: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 20, marginBottom: 16,
        padding: 12, elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 4, alignItems: 'center',
        borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border
    },
    cardImage: { width: 80, height: 80, borderRadius: 20, marginRight: 16 },
    imagePlaceholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#f3f4f6', marginRight: 16, alignItems: 'center', justifyContent: 'center' },
    cardContent: { flex: 1, justifyContent: 'center', paddingRight: 8 },
    cardTitle: { fontSize: 15, fontFamily: 'Outfit_700Bold', color: colors.text, marginBottom: 12, lineHeight: 22 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tag: { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    tagText: { color: isDarkMode ? colors.primaryLight : '#4f46e5', fontSize: 10, fontFamily: 'Outfit_600SemiBold', textTransform: 'uppercase' },
    dateText: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: colors.textDim, fontFamily: 'Outfit_500Medium' },
    deleteButton: { padding: 6, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fee2e2', borderRadius: 8, alignSelf: 'flex-start' },
    clearAllButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fee2e2', borderRadius: 20 },
    clearAllText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: colors.danger }
});







