import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { MotiView } from 'moti';
import { ThemeContext } from '../context/ThemeContext';

const BASE_URL = 'https://api.jharkhandbiharupdates.com/api/v1';

export default function MyPostsListScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { categoryId, categoryLabel } = route.params;
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    useEffect(() => {
        fetchData(0);
    }, []);

    const fetchData = async (pageNum = 0) => {
        if (pageNum === 0) setLoading(true);
        else setIsFetchingMore(true);

        try {
            let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            if (!token) {
                navigation.replace('Login');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`${BASE_URL}/user/my-posts?category=${categoryId}&page=${pageNum}&size=10`, { headers });

            const newPosts = res.data.data.content || [];
            
            if (pageNum === 0) {
                setPosts(newPosts);
            } else {
                setPosts(prev => [...prev, ...newPosts]);
            }

            setHasMore(!res.data.data.last);
            setPage(pageNum);

        } catch (error) {
            console.error("Error fetching category posts:", error);
            Toast.show({ type: 'error', text1: 'Failed to load data' });
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    const fetchMoreData = () => {
        if (!hasMore || isFetchingMore || loading) return;
        fetchData(page + 1);
    };

    const confirmDelete = (postId) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this post?")) {
                handleDelete(postId);
            }
        } else {
            Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: () => handleDelete(postId), style: "destructive" }
            ]);
        }
    };

    const handleDelete = async (postId) => {
        try {
            let token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            const headers = { Authorization: `Bearer ${token}` };

            let endpoint = '';
            if (categoryId === 'community') endpoint = `${BASE_URL}/community/${postId}`;
            if (categoryId === 'jobs') endpoint = `${BASE_URL}/jobs/${postId}`;
            if (categoryId === 'events') endpoint = `${BASE_URL}/events/${postId}`;
            if (categoryId === 'properties') endpoint = `${BASE_URL}/properties/${postId}`;
            if (categoryId === 'stateNews') endpoint = `${BASE_URL}/state-news/${postId}`;

            await axios.delete(endpoint, { headers });
            setPosts(prev => prev.filter(p => p.id !== postId));
            Toast.show({ type: 'success', text1: 'Successfully deleted' });
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            console.error("Delete error:", error);
            Toast.show({ type: 'error', text1: 'Failed to delete' });
        }
    };

    const handleView = (item) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (categoryId === 'community') navigation.navigate('CommunityPostDetails', { postId: item.id });
        else if (categoryId === 'jobs') navigation.navigate('JobDetails', { jobId: item.id });
        else if (categoryId === 'events') navigation.navigate('EventDetails', { eventId: item.id });
        else if (categoryId === 'properties') navigation.navigate('PropertyDetails', { propertyId: item.id });
        else if (categoryId === 'stateNews') navigation.navigate('StateNewsDetails', { newsId: item.id });
    };

    const renderPost = ({ item }) => {
        const title = item.title || item.name || item.jobTitle || item.content;
        const dateStr = item.createdAt || item.postedAt || item.date || new Date().toISOString();
        const createdDate = new Date(dateStr).toLocaleDateString();

        let prefixIcon = '';
        if (categoryId === 'events') prefixIcon = '🔥 ';
        if (categoryId === 'properties') prefixIcon = '🏠 ';
        if (categoryId === 'jobs') prefixIcon = '💼 ';

        const isPending = item.status === 'PENDING';

        return (
            <MotiView
                style={[styles.postCard, isPending && { borderColor: '#ef4444', borderWidth: 1 }]}
                from={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1}>{prefixIcon}{title}</Text>
                        <View style={[styles.statusBadge, isPending && { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' }]}>
                            <Text style={[styles.statusText, isPending && { color: '#ef4444' }]}>
                                {isPending ? 'PENDING' : 'APPROVED'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.dateRow}>
                        <Text style={styles.dateText}>Date: {dateStr.substring(0, 19).replace('T', ' ')}</Text>
                        <Text style={styles.dateText}>Created: {createdDate}</Text>
                    </View>
                </View>

                <View style={styles.actionDivider} />

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => handleView(item)}>
                        <Ionicons name="eye-outline" size={16} color="#047857" />
                        <Text style={styles.viewBtnText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => confirmDelete(item.id)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
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
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{categoryLabel}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : posts.length > 0 ? (
                <FlatList
                    data={posts}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={renderPost}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    onEndReached={fetchMoreData}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => 
                        isFetchingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : null
                    }
                />
            ) : (
                <View style={styles.centerBox}>
                    <Ionicons name="document-text-outline" size={64} color={colors.textDim} />
                    <Text style={styles.emptyTitle}>No posts found</Text>
                    <Text style={styles.emptyDesc}>You haven't created any posts in {categoryLabel} yet.</Text>
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
    postCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.2 : 0.03, shadowRadius: 8, elevation: 1 },
    cardInfo: { marginBottom: 10 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    title: { flex: 1, fontSize: 14, fontFamily: 'Outfit_600SemiBold', color: colors.text, marginRight: 10 },
    statusBadge: { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusText: { color: colors.primary, fontSize: 9, fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateText: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: colors.textDim },
    actionDivider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    viewBtn: { backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5' },
    viewBtnText: { marginLeft: 4, color: isDarkMode ? '#34d399' : '#047857', fontFamily: 'Outfit_600SemiBold', fontSize: 12 },
    deleteBtn: { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2' },
    deleteBtnText: { marginLeft: 4, color: isDarkMode ? '#f87171' : '#ef4444', fontFamily: 'Outfit_600SemiBold', fontSize: 12 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', color: colors.text, marginTop: 16, marginBottom: 8 },
    emptyDesc: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: colors.textDim, textAlign: 'center', lineHeight: 20 }
});
